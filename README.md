# R6.1.2 isolated public-toolchain retrieval

This temporary branch does not contain or deploy application source. Its sole workflow obtains public npm dependencies, Khronos KTX tools and Playwright Chromium for offline verification of the user's attached R6.1.2 ZIP. It does not modify main, use deployment credentials, or authorize production. The application dependency declaration is checked out from immutable commit 24081acd8951d0368b50cca272f41e8eb341fcec. The exact attached ZIP must still pass its own clean offline npm ci, typecheck, build and release gates.
