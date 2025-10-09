import { World } from './world.js';

let _world = null;

window.addEventListener('DOMContentLoaded', () => {
    _world = new World();
});