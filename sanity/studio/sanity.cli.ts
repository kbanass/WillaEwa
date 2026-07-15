import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: 'csed1mdo',
    dataset: 'production'
  },
  deployment: {
    /**
     * Enable auto-updates for studios.
     * Learn more at https://www.sanity.io/docs/studio/latest-version-of-sanity#k47faf43faf56
     */
    autoUpdates: true,
  },
    typegen: {
    path: "../../astro/src/**/*.{ts,tsx,astro}",
    schema: "./schema.json",
    generates: "../../astro/src/sanity.types.ts",
    overloadClientMethods: true,
  },
})
