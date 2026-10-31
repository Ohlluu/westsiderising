// App Check for the existing compat Firebase SDK and named signing apps.
// Keep the site key in sync with firebase-config.js. This is a public site key.
(function () {
    const siteKey = '6LeVGAouAAAAABBP2NnHzSL88CCEgv6gJUEbVXi9';
    const activatedApps = new WeakSet();

    window.wrActivateAppCheck = function (app) {
        const localPreview = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
        if (localPreview && !self.FIREBASE_APPCHECK_DEBUG_TOKEN) return;
        if (activatedApps.has(app)) return;

        app.appCheck().activate(
            new firebase.appCheck.ReCaptchaEnterpriseProvider(siteKey),
            true
        );
        activatedApps.add(app);
    };
})();
