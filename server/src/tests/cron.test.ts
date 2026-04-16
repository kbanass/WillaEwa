import { describe, it, expect, vi, beforeEach } from "vitest";

// Mockujemy zewnętrzne zależności
vi.mock("axios");
vi.mock("./db");
vi.mock("./generate");

import axios from "axios";
import { db } from "./db";
import { generujOpinie } from "./generate.js";
import { pobierzOpinie } from "./cron";

// Przykładowe opinie z Google API
const mockOpinie = [
  {
    author_name: "Jan Kowalski",
    rating: 5,
    text: "Świetne miejsce!",
    time: 1234567890,
    profile_photo_url: "https://example.com/photo.jpg",
  },
  {
    author_name: "Anna Nowak",
    rating: 4,
    text: "Polecam!",
    time: 1234567891,
    profile_photo_url: "https://example.com/photo2.jpg",
  },
];

describe("pobierzOpinie", () => {
  beforeEach(() => {
    // Czyść mocki przed każdym testem
    vi.clearAllMocks();
  });

  it("pobiera opinie z Google i zapisuje nowe do bazy", async () => {
    // Mockujemy odpowiedź Google API
    vi.mocked(axios.get).mockResolvedValue({
      data: { result: { reviews: mockOpinie } },
    });

    // Mockujemy db — opinia nie istnieje w bazie
    const mockGet = vi.fn().mockReturnValue(null);
    const mockRun = vi.fn();
    vi.mocked(db.prepare).mockReturnValue({
      get: mockGet,
      run: mockRun,
      all: vi.fn().mockReturnValue(mockOpinie),
    } as any);

    await pobierzOpinie();

    // Sprawdź czy axios został wywołany z odpowiednimi parametrami
    expect(axios.get).toHaveBeenCalledWith(
      "https://maps.googleapis.com/maps/api/place/details/json",
      expect.objectContaining({
        params: expect.objectContaining({
          place_id: process.env.GOOGLE_PLACE_ID,
          fields: "reviews",
          language: "pl",
        }),
      }),
    );

    // Sprawdź czy opinie zostały zapisane do bazy
    expect(mockRun).toHaveBeenCalledTimes(2);

    // Sprawdź czy HTML został zregenerowany
    expect(generujOpinie).toHaveBeenCalledTimes(1);
  });

  it("nie zapisuje opinii które już są w bazie", async () => {
    vi.mocked(axios.get).mockResolvedValue({
      data: { result: { reviews: mockOpinie } },
    });

    // Mockujemy db — opinia już istnieje
    const mockRun = vi.fn();
    vi.mocked(db.prepare).mockReturnValue({
      get: vi.fn().mockReturnValue({ id: 1 }), // już istnieje
      run: mockRun,
      all: vi.fn().mockReturnValue([]),
    } as any);

    await pobierzOpinie();

    // Nie powinno zapisywać nic nowego
    expect(mockRun).not.toHaveBeenCalled();
    expect(generujOpinie).not.toHaveBeenCalled();
  });

  it("nie crashuje gdy Google API zwróci błąd", async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error("Network error"));

    // Funkcja powinna obsłużyć błąd bez rzucania wyjątku
    await expect(pobierzOpinie()).resolves.not.toThrow();
  });

  it("nie crashuje gdy Google zwróci pustą listę opinii", async () => {
    vi.mocked(axios.get).mockResolvedValue({
      data: { result: { reviews: [] } },
    });

    await pobierzOpinie();

    expect(generujOpinie).not.toHaveBeenCalled();
  });
});
