import axios from "axios";
import "dotenv/config";
import { generateHTMLReviews } from "./generate.js";
import type { ReviewStatus } from "./types.js";

export const getReviews = async () => {
  try {
    console.log(process.env.GOOGLE_API_KEY);
    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/place/details/json",
      {
        params: {
          place_id: "ChIJwZLu2UUx_UYR6rzh8Y8h6OA",
          fields: "name,rating,reviews",
          language: "pl",
          key: process.env.GOOGLE_API_KEY,
        },
      },
    );
    console.log(response.data.result.reviews);
    if (response.data.status === "OK") {
      const googleReviews: GoogleReview[] = response.data.result.reviews || [];

      const reviews = googleReviews.map((rev) => mapGoogleReview(rev));
      console.log("Opinie:", reviews);
      generateHTMLReviews(reviews);
    } else {
      console.log(
        "Błąd API:",
        response.data.status,
        response.data.error_message,
      );
    }
  } catch (e) {
    console.error("Błąd połączenia:", e);
  }
};

getReviews();

interface GoogleReview {
  author_name: string;
  rating: number;
  text: string;
  time: number;
}
function mapGoogleReview(googleReview: GoogleReview) {
  return {
    id: 1231312,
    author: googleReview.author_name,
    quote: googleReview.text,
    rating: googleReview.rating,
    time: googleReview.time,
    source: "google",
    status: "accepted" as ReviewStatus,
    email: null,
    createdAt: Math.floor(Date.now() / 1000),
  };
}
// Opinie: [
//   {
//     author_name: "Jerzy Gniadek",
//     author_url:
//       "https://www.google.com/maps/contrib/113822182694892300941/reviews",
//     language: "pl",
//     original_language: "pl",
//     profile_photo_url:
//       "https://lh3.googleusercontent.com/a-/ALV-UjXvAtKvMhkyWqGLaCXhxTlRO1Dt8ZE22TZMy4KY90ZTwkTV4gja=s128-c0x00000000-cc-rp-mo-ba3",
//     rating: 4,
//     relative_time_description: "8 miesięcy temu",
//     text:
//       "Byliśmy tam przez tydzień w 3-ech starszych panów (bez żon) w końcu czerwca tak, że jeszcze przed wakacjami i nie było specjalnie tłoku, nawet w centrum samej Krynicy.\n" +
//       "\n" +
//       "Mimo nie nadzwyczajnej pogody, można było spokojnie odpocząć, bo willa choć skromna, to bardzo czysta i przytulna (w pokoju wszystko co potrzebne na krótki pobyt), przy tym położona na skraju kurortu - przy wjeździe do Krynicy, co zapewnia ciszę i spokój.\n" +
//       "\n" +
//       "Sam pokój troszkę mały (zwłaszcza łazienka) na trzech dorosłych chłopów, ale do samego spania wystarczy, bo i tak czas spędza się albo na plaży (do morza 1200 m przez uroczy las), albo na wojażach (Trójmiasto, Frombork -statkiem przez Zalew Wiślany za 80 zł), albo na dużym tarasie (udostępniony grill).\n" +
//       "\n" +
//       "Właścicielka bardzo miła i pomocna (okazało się, że jednocześnie jest pisarką - Adrianna T. Zacząłem nawet czytać Jej wydaną już książkę, ale choć wciągająca brakło czasu na jej całkowite zaliczenie) -widać, że zależy Jej na swoich gościach;\n" +
//       "\n" +
//       "- udostępnia bezpłatny parking, na półpiętrze duża lodówka z zamrażarką (w pokojach małe), mikrofala, dwupłytowa kuchenka elektryczna, garnki, patelnie itp.\n" +
//       "Ogólnie wszystko na piątkę z plusem.\n" +
//       "Dziękujemy i pozdrawiamy.",
//     time: 1751757547,
//     translated: false,
//   },
//   {
//     author_name: "kowboj87",
//     author_url:
//       "https://www.google.com/maps/contrib/111284555287527475728/reviews",
//     language: "pl",
//     original_language: "pl",
//     profile_photo_url:
//       "https://lh3.googleusercontent.com/a/ACg8ocKAO3bb-4TVdINEIIURSRCV8S7yOmsnb_HN2COaoeVlphaRLg=s128-c0x00000000-cc-rp-mo",
//     rating: 5,
//     relative_time_description: "3 tygodnie temu",
//     text: "Polecam, serdecznie. Bardzo miła Pani właściciel, bardzo czysto. Cisza spokój i bardzo dobra cena 🤩",
//     time: 1772135210,
//     translated: false,
//   },
//   {
//     author_name: "Iwona Stankiewicz",
//     author_url:
//       "https://www.google.com/maps/contrib/118371417850376224838/reviews",
//     language: "pl",
//     original_language: "pl",
//     profile_photo_url:
//       "https://lh3.googleusercontent.com/a/ACg8ocJ4D5US5-u_Pi3NkpDRLuNCV3sphye11h705X82FaprqKn0Kw=s128-c0x00000000-cc-rp-mo",
//     rating: 5,
//     relative_time_description: "9 miesięcy temu",
//     text: "Polecam pobyt w Willa Ewa. Czysto, przyjemnie, w pokoju jest wszystko co potrzebne. Spokojna okolica, niedaleko przejście na plażę przez piękny las. Blisko też do sklepu. Przemiła Pani Właścicielka. Miejsce bezpieczne, skromne, zadbane i otwarte na potrzeby gości.",
//     time: 1750621167,
//     translated: false,
//   },
//   {
//     author_name: "Józef Banacki",
//     author_url:
//       "https://www.google.com/maps/contrib/113403344662231136043/reviews",
//     language: "pl",
//     original_language: "pl",
//     profile_photo_url:
//       "https://lh3.googleusercontent.com/a/ACg8ocIFC6E_KLwXu1n_DHRPaKIs2A21jtyJWy_XjGP0xCqQgx2xcw=s128-c0x00000000-cc-rp-mo",
//     rating: 5,
//     relative_time_description: "8 miesięcy temu",
//     text: "Dziś wróciłem z pobytu w willa Ewa, to jest drugi pobyt w tym miejscu, jestem bardzo zadowolony,włascielka przesympatyczna, pokoje czysciutkie, polecam z czystym sumieniem ,do zobaczenia za rok pozdrawiam",
//     time: 1751487504,
//     translated: false,
//   },
//   {
//     author_name: "Kaska B.",
//     author_url:
//       "https://www.google.com/maps/contrib/109493294494547657728/reviews",
//     language: "pl",
//     original_language: "pl",
//     profile_photo_url:
//       "https://lh3.googleusercontent.com/a-/ALV-UjVPLMg04bUDN4Gv9rgsEVFTxFmwnr9ZsYHCOmaxus5Znbfs61Mp=s128-c0x00000000-cc-rp-mo",
//     rating: 5,
//     relative_time_description: "8 miesięcy temu",
//     text: "Dziękujemy za udany wypoczynek w Willi Ewa , będziemy wspominać go z przyjemnością,kwatera bardzo w porządku,właścicielka bardzo miła..polecam miejsce do spokojnego urlopu",
//     time: 1753381390,
//     translated: false,
//   },
// ];
