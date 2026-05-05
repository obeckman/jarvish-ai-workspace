import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  overwrite: true,
  // The schema is defined in src/Backend/graphql/schema.ts
  // We point to the file and codegen will use graphql-tag-pluck to find the schema definition
  schema: 'src/Backend/graphql/schema.ts',
  generates: {
    // Backend types
    'src/Backend/graphql/__generated__/resolvers-types.ts': {
      plugins: ['typescript', 'typescript-resolvers'],
      config: {
        useIndexSignature: true,
        // Context type for resolvers if you have one, e.g.
        // contextType: '@/Backend/types#MyContext',
      },
    },
    // Frontend types (Typed Operations for fetch compatibility)
    'src/features/jarvishAgent/gql/types.ts': {
      documents: ['src/features/jarvishAgent/**/*.ts', '!src/features/jarvishAgent/gql/**/*'],
      plugins: ['typescript', 'typescript-operations', 'typed-document-node'],
      config: {
        documentMode: 'string', // This makes the generated document nodes strings!
      },
    },
  },
  ignoreNoDocuments: true,
};

export default config;
