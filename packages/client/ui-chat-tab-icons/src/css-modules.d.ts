/** CSS Modules: the bundler replaces each class key with its hashed name. */
declare module '*.module.css' {
  const classes: Readonly<Record<string, string>>
  export default classes
}
