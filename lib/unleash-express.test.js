import { test } from 'ava';
import { UnleashExpress } from './unleash-express';
import { Unleash } from '../test/helpers';

class App {
    constructor(cookies) {
        this.cookies = cookies;
        this.req = { cookies: this.cookies, query: {} };
        this.res = { cookie: () => {} };
    }

    use(middleware) {
        middleware(this.req, this.res, () => {});
    }
}

test('should provide a middleware function', t => {
    const unleash = new Unleash();
    const unleashExpress = new UnleashExpress(unleash);
    t.true(typeof unleashExpress.middleware === 'function');
});

test('should use the resulting state of the features', t => {
    const app = new App();
    const unleash = new Unleash({
        features: [{
            name: 'feature.A',
            enabled: true,
        },
        {
            name: 'feature.B',
            enabled: false,
        }],
    });
    const unleashExpress = new UnleashExpress(unleash);
    app.use(unleashExpress.middleware());
    app.use((req) => {
        t.true(req.unleash.isEnabled('feature.A'));
        t.false(req.unleash.isEnabled('feature.B'));
    });
});

test('should use the experiment result', t => {
    const app = new App();
    const unleash = new Unleash({
        features: [{
            name: 'feature.variants.A',
            enabled: true,
            variants: [{ name: 'control' }],
        }],
    });
    const unleashExpress = new UnleashExpress(unleash);
    app.use(unleashExpress.middleware());
    app.use((req) => {
        req.unleash.experiment('feature.variants.A');
        t.true(req.unleash.results.get('feature.variants.A').name === 'control');
    });
});

test('should use the persisted experiment result across multiple experiment calls', t => {
    const app = new App();
    const unleash = new Unleash({
        features: [{
            name: 'feature.variants.A',
            enabled: true,
            variants: [{ name: 'control' }, { name: 'variant_1' }],
        }],
    });
    const unleashExpress = new UnleashExpress(unleash);
    app.use(unleashExpress.middleware());
    app.use((req) => {
        t.true(req.unleash.experiment('feature.variants.A').name === 'control');
        t.true(req.unleash.results.get('feature.variants.A').name === 'control');
        t.true(req.unleash.experiment('feature.variants.A').name === 'control');
        t.true(req.unleash.results.get('feature.variants.A').name === 'control');
    });
});

test('should use the client state of a feature even if persisted', t => {
    const app = new App({
        unleash: { 'feature.A': true },
    });
    const unleash = new Unleash({
        features: [{
            name: 'feature.A',
            enabled: false,
        }],
    });
    const unleashExpress = new UnleashExpress(unleash);
    app.use(unleashExpress.middleware());
    app.use((req) => {
        t.false(req.unleash.isEnabled('feature.A'));
    });
});

test('should override the result of an experiment even if persisted', t => {
    const app = new App({
        unleash: { 'feature.variants.A': { name: 'control' } },
    });
    const unleash = new Unleash({
        features: [{
            name: 'feature.variants.A',
            enabled: false,
            variants: [{ name: 'control' }, { name: 'variant_1' }],
        }],
    });
    const unleashExpress = new UnleashExpress(unleash);
    app.use(unleashExpress.middleware());
    app.use((req) => {
        t.true(typeof req.unleash.experiment('feature.variants.A') === 'undefined');
    });
});
