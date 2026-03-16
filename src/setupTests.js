// Polyfill TextEncoder/TextDecoder for react-router v7 in Jest (JSDOM)
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// jest-dom adds custom jest matchers for asserting on DOM nodes.
import '@testing-library/jest-dom';
