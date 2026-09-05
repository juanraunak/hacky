// Both re-exports are required. SpacetimeDB registers reducers and lifecycle
// hooks from the named exports of this entry file, so a plain
// `import './connection'` evaluates the file but publishes nothing: the
// reducers vanish with no build error and no publish error.
export * from './connection';
export * from './game';
export * from './world';

// The entry file must expose the schema as the default export.
export { default } from './schema';
