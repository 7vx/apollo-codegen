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
  GraphQLEnumType,
  GraphQLInputObjectType,
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
  "Duration": t.TSNumberKeyword(),
  "CarPlatform": t.TSUnionType([
    t.TSLiteralType(t.stringLiteral("turo")),
    t.TSLiteralType(t.stringLiteral("getaround")),
    t.TSLiteralType(t.stringLiteral("ryde")),
    t.TSLiteralType(t.stringLiteral("hyrecar")),
    t.TSLiteralType(t.stringLiteral("zubie")),
    t.TSLiteralType(t.stringLiteral("bouncie")),
    t.TSLiteralType(t.stringLiteral("automatic")),
    t.TSLiteralType(t.stringLiteral("tesla")),
    t.TSLiteralType(t.stringLiteral("viper")),
    t.TSLiteralType(t.stringLiteral("spireon_goldstar")),
    t.TSLiteralType(t.stringLiteral("bmw"))
  ]),
  "LoginProvider": t.TSUnionType([
    t.TSLiteralType(t.stringLiteral("facebook")),
    t.TSLiteralType(t.stringLiteral("google")),
    t.TSLiteralType(t.stringLiteral("apple")),
  ]),
  "LD": t.TSStringKeyword(),
  "URI": t.TSStringKeyword(),
  "Temporal": t.TSStringKeyword(),
  "CarProfilePhoto": t.TSStringKeyword(),
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
    } else if (graphQLType instanceof GraphQLEnumType) {
      return t.TSTypeReference(t.identifier("g." + graphQLType.name));
    } else if (graphQLType instanceof GraphQLInputObjectType) {
      return t.TSTypeReference(t.identifier("g." + graphQLType.name));
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
