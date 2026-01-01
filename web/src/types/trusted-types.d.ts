export { };

declare global {
    interface TrustedTypePolicyFactory {
        createPolicy(
            name: string,
            rules: {
                createHTML?: (input: string) => string;
                // add more sinks if you ever need them:
                // createScript?: (input: string) => string;
                // createScriptURL?: (input: string) => string;
            }
        ): TrustedTypePolicy;
    }

    interface TrustedTypePolicy {
        createHTML(input: string): TrustedHTML;
    }

    // Keep it as an opaque branded type
    interface TrustedHTML { }

    interface Window {
        trustedTypes?: TrustedTypePolicyFactory;
    }
}
