module.exports = {
    "**/*.{ts,tsx}": "eslint --fix --max-warnings 0 --no-eslintrc --config .eslintrc.lint-staged.js",
    "**/{*,_}": "prettier --write --ignore-unknown",
    "**/{package.json, _}": () => "yarn install --immutable",
};
