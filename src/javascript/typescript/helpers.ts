import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLInt,
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLScalarType,
  GraphQLString,
  GraphQLType,
} from 'graphql'

import * as t from '@babel/types';

import { CompilerOptions } from '../../compiler';

const builtInScalarMap = {
  [GraphQLString.name]: t.TSStringKeyword(),
  [GraphQLInt.name]: t.TSNumberKeyword(),
  [GraphQLFloat.name]: t.TSNumberKeyword(),
  [GraphQLBoolean.name]: t.TSBooleanKeyword(),
  [GraphQLID.name]: t.TSStringKeyword(),
  // There is no support for custom scalars in Apollo Client:
  // - https://github.com/apollographql/apollo-client/issues/585
  // - https://github.com/apollographql/apollo-client/issues/2626
  "Instant": t.TSNumberKeyword(),
  "CarPlatform": t.TSStringKeyword(),
  "URI": t.TSStringKeyword(),
}

export function createTypeFromGraphQLTypeFunction(
  compilerOptions: CompilerOptions
): (graphQLType: GraphQLType, typeName?: string) => t.TSType {
  function nonNullableTypeFromGraphQLType(graphQLType: GraphQLType, typeName?: string): t.TSType {
    if (graphQLType instanceof GraphQLList) {
      const elementType = typeFromGraphQLType(graphQLType.ofType, typeName);
      return t.TSArrayType(
        t.isTSUnionType(elementType) ? t.TSParenthesizedType(elementType) : elementType
      );
    } else if (graphQLType instanceof GraphQLScalarType) {
      const builtIn = builtInScalarMap[typeName || graphQLType.name]
      if (builtIn != null) {
        return builtIn;
      } else if (compilerOptions.passthroughCustomScalars) {
        return t.TSAnyKeyword();
      } else {
        return t.TSTypeReference(t.identifier(graphQLType.name));
      }
    } else if (graphQLType instanceof GraphQLNonNull) {
      // This won't happen; but for TypeScript completeness:
      return typeFromGraphQLType(graphQLType.ofType, typeName);
    } else {
      return t.TSTypeReference(t.identifier(typeName || graphQLType.name));
    }
  }

  function typeFromGraphQLType(graphQLType: GraphQLType, typeName?: string): t.TSType {
    if (graphQLType instanceof GraphQLNonNull) {
      return nonNullableTypeFromGraphQLType(graphQLType.ofType, typeName);
    } else {
      const type = nonNullableTypeFromGraphQLType(graphQLType, typeName);
      return t.TSUnionType([type, t.TSNullKeyword()]);
    }
  }

  return typeFromGraphQLType;
}
