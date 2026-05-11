import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  overwrite: true,
  schema: 'src/Backend/graphql/schema.ts',
  generates: {
    'src/Backend/graphql/__generated__/resolvers-types.ts': {
      plugins: ['typescript', 'typescript-resolvers'],
      config: {
        useIndexSignature: true,
      },
    },
    'src/features/jarvishAgent/graphql/__generated__/': {
      preset: 'client',
      plugins: [],
      config: {
        documentMode: 'string',
      },
      documents: ['src/features/jarvishAgent/**/*.ts'],
    },
  },
  ignoreNoDocuments: true,
};

export default config;
