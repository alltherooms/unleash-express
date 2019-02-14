const { Results } = require('./results');
const { ExpressCookieStore } = require('./cookies-store');

class UnleashExpress {
    constructor(client, options = {}) {
        this.client = client;
        this.options = Object.assign({
            cookieName: 'unleash',
            cookieOptions: {},
            overrideTokens: {},
        }, options);
    }

    middleware() {
        const options = this.options;
        const getWrappedClientFunction = this.getWrappedClientFunction;
        const self = this;
        return function unleashExpress (req, res, next) {
            const overrides = self.parseOverrides(req);
            const features = self.getFeatures(self.client.getToggles(), overrides, options.overrideTokens);
            const { cookieName, cookieOptions } = options;
            const cookieStore = new ExpressCookieStore(req, res, { cookieName, cookieOptions });
            const results = new Results(features, cookieStore);
            const wrappedExperiment = getWrappedClientFunction.call(self, 'experiment', results);
            const wrappedIsEnabled = getWrappedClientFunction.call(self, 'isEnabled', results);

            req.unleash = {
                experiment: wrappedExperiment,
                isEnabled: wrappedIsEnabled,
                results,
            };

            next();
        };
    }

    parseOverrides(req) {
        return [].concat(req.query.feature)
            .filter(o => !!o)
            .map((o) => {
                const parts = o.split(':');
                return {
                    name: parts[0],
                    token: parts[1],
                };
            });
    }

    getFeatures(clientFeatures, overrides, tokens) {
        const featuresByName = clientFeatures.reduce((a, b) => {
            a[b.name] = b;
            return a;
        }, {});

        overrides.forEach((override) => {
            const feature = featuresByName[override.name];
            const token = tokens[override.name];
            if (feature && token === override.token) {
                feature.enabled = true;
                // Remove all the strategies to guarantee it will be enabled
                feature.strategies = null;
            }
        });

        return clientFeatures;
    }

    getWrappedClientFunction(fn, results, resultsKey) {
        const client = this.client;
        if (!client || typeof client[fn] != 'function') {
            throw new Error('Cannot wrap client function. Client or function is not defined.');
        }

        const original = client[fn];

        return function wrappedClientFn (...args) {
            const featureName = args[0];
            const persistedResult = results.get(featureName);
            const clientResult = original.apply(client, args);
            let result = clientResult && persistedResult ? persistedResult : clientResult;
            results.persist(featureName, result);
            return result;
        };
    }
}

module.exports.UnleashExpress = UnleashExpress;
