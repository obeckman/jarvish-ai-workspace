import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  overwrite: true,
  schema: 'src/backend/graphql/schema.ts',
  generates: {
    'src/backend/graphql/__generated__/resolvers-types.ts': {
      plugins: ['typescript', 'typescript-resolvers'],
      config: {
        useIndexSignature: true,
      },
    },
    'src/frontend/features/jarvishAgent/graphql/__generated__/': {
      preset: 'client',
      plugins: [],
      config: {
        documentMode: 'string',
      },
      documents: ['src/frontend/features/jarvishAgent/**/*.ts'],
    },
  },
  ignoreNoDocuments: true,
};

export default config;
