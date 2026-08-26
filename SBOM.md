# IRENX SBOM policy

IRENX release artifacts should ship with a machine-readable Software Bill of Materials (SBOM) generated from the exact dependency graph used for the build.

Preferred formats:

- SPDX JSON
- CycloneDX JSON

Minimum SBOM metadata:

- package/component name
- version
- package URL where available
- SPDX license identifier where available
- dependency relationship
- source/repository reference where available
- build/release identifier

The generated SBOM must be treated as a release artifact and must not contain API keys or credentials.

A future release workflow should generate the SBOM after dependency installation and attach it to the GitHub Release together with checksums/provenance.
