declare const __ATLAS_BUILD_DATE__: string;

interface ImportMeta {
  glob: (pattern: string, options: { eager: true; import: "default" }) => Record<string, unknown>;
}
