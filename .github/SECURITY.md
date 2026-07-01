# Security Policy

## Supported versions

This project is pre-public-release. Security fixes currently target the main working tree.

## Reporting a vulnerability

Do not open a public issue for vulnerability details.

If GitHub Private Vulnerability Reporting is enabled for this repository, use the repository **Security** tab and choose **Report a vulnerability**.

If that option is not available, contact the maintainer privately through the repository hosting platform or the maintainer contact route listed for the project.

Please include:

- Affected file or feature
- Steps to reproduce
- Expected and actual behavior
- Browser/OS information
- Any proof-of-concept, if safe to share

Do not publicly post exploit details for issues that could affect users.

## Security notes

- The app is designed to run locally.
- OBS helper APIs are intended for `127.0.0.1` / `localhost` use.
- The local server sends CSP and Permissions-Policy headers.
- Camera and microphone data are processed in the browser.
- MediaPipe face tracking assets are loaded from external CDNs at runtime.
