const { UnleashExpress } = require('../lib/unleash-express');
const express = require('express');
const supertest = require('supertest');
const cookieParser = require('cookie-parser');

class Unleash {
    constructor(features = {}) {
        this.features = features;
    }

    getToggles() {
        return this.features.features;
    }

    experiment(name) {
        const features = this.features.features;
        const feature = features.find(f => f.name === name && f.enabled === true);
        let variant;

        if (feature && feature.variants) {
            feature.currentVariantIndex = feature.currentVariantIndex || 0;
            variant = feature.variants[feature.currentVariantIndex];
            if (feature.currentVariantIndex + 1 < feature.variants.length) {
                feature.currentVariantIndex++;
            }
        }

        return variant;
    }

    isEnabled(name) {
        const features = this.features.features;
        return features.some(f => f.name === name && f.enabled === true);
    }
}

function setupApp(options = {}) {
    const unleash = options.unleash || new Unleash();
    const unleashExpress = new UnleashExpress(unleash, options.unleashExpressOpts);

    const app = express();
    app.use(cookieParser());
    app.use(unleashExpress.middleware());
    app.use((err, req, res, next) => {
        console.error(err.stack);
    });

    const request = supertest;

    return {
        app,
        request,
    }
}

module.exports.Unleash = Unleash;
module.exports.setupApp = setupApp;
