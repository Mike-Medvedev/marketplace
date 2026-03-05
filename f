Run docker/build-push-action@v6
GitHub Actions runtime token ACs
Docker info
Proxy configuration
Buildx version
Builder info
/usr/bin/docker buildx build --build-arg VITE_API_URL=*** --build-arg VITE_ENV=production --build-arg VITE_GOOGLE_MAPS_API_KEY=*** --iidfile /home/runner/work/_temp/docker-actions-toolkit-P8sKT6/build-iidfile-61dc045600.txt --tag ***/marketscrape-ui:latest --metadata-file /home/runner/work/_temp/docker-actions-toolkit-P8sKT6/build-metadata-b7464adae3.json --no-cache --push .
#0 building with "default" instance using docker driver

#1 [internal] load build definition from Dockerfile
#1 transferring dockerfile: 323B done
#1 DONE 0.0s

#2 [auth] library/nginx:pull token for registry-1.docker.io
#2 DONE 0.0s

#3 [auth] library/node:pull token for registry-1.docker.io
#3 DONE 0.0s

#4 [internal] load metadata for docker.io/library/node:22-alpine
#4 ...

#5 [internal] load metadata for docker.io/library/nginx:stable-alpine
#5 DONE 0.5s

#4 [internal] load metadata for docker.io/library/node:22-alpine
#4 DONE 0.5s

#6 [internal] load .dockerignore
#6 transferring context: 106B done
#6 DONE 0.0s

#7 [internal] load build context
#7 transferring context: 401.26kB 0.0s done
#7 DONE 0.0s

#8 [build 1/6] FROM docker.io/library/node:22-alpine@sha256:e4bf2a82ad0a4037d28035ae71529873c069b13eb0455466ae0bc13363826e34
#8 resolve docker.io/library/node:22-alpine@sha256:e4bf2a82ad0a4037d28035ae71529873c069b13eb0455466ae0bc13363826e34 done
#8 sha256:e4bf2a82ad0a4037d28035ae71529873c069b13eb0455466ae0bc13363826e34 6.41kB / 6.41kB done
#8 sha256:48f53c3f0105ccddcc5e4f520347398dfc0ba9b3008fbfd98a2add27e5797957 1.72kB / 1.72kB done
#8 sha256:463254b4a8121318a9f8861a08bdde48fcfd528848534e7ba742b3ce5146fd17 6.52kB / 6.52kB done
#8 sha256:589002ba0eaed121a1dbf42f6648f29e5be55d5c8a6ee0f8eaa0285cc21ac153 0B / 3.86MB 0.1s
#8 sha256:589002ba0eaed121a1dbf42f6648f29e5be55d5c8a6ee0f8eaa0285cc21ac153 3.86MB / 3.86MB 0.1s done
#8 extracting sha256:589002ba0eaed121a1dbf42f6648f29e5be55d5c8a6ee0f8eaa0285cc21ac153 0.1s done
#8 sha256:8d513d1f314d3646adaf156be912f8de408c740e43d90cad5ce06b9de27e7bdf 0B / 51.60MB 0.3s
#8 sha256:8d513d1f314d3646adaf156be912f8de408c740e43d90cad5ce06b9de27e7bdf 4.19MB / 51.60MB 0.4s
#8 sha256:2b752f7c71fd1a08980fdf09b7379d8304c8ef2569526934a2089ed26d771778 0B / 1.26MB 0.4s
#8 sha256:8d513d1f314d3646adaf156be912f8de408c740e43d90cad5ce06b9de27e7bdf 23.07MB / 51.60MB 0.6s
#8 sha256:2b752f7c71fd1a08980fdf09b7379d8304c8ef2569526934a2089ed26d771778 1.26MB / 1.26MB 0.4s done
#8 sha256:fc1c5222d85fe45cd255019912158424888b168c8413fb42c8e166c37f1833eb 447B / 447B 0.5s done
#8 sha256:8d513d1f314d3646adaf156be912f8de408c740e43d90cad5ce06b9de27e7bdf 33.55MB / 51.60MB 0.7s
#8 sha256:8d513d1f314d3646adaf156be912f8de408c740e43d90cad5ce06b9de27e7bdf 37.75MB / 51.60MB 0.8s
#8 sha256:8d513d1f314d3646adaf156be912f8de408c740e43d90cad5ce06b9de27e7bdf 51.60MB / 51.60MB 0.9s done
#8 extracting sha256:8d513d1f314d3646adaf156be912f8de408c740e43d90cad5ce06b9de27e7bdf
#8 ...

#9 [stage-1 1/3] FROM docker.io/library/nginx:stable-alpine@sha256:15e96e59aa3b0aada3a121296e3bce117721f42d88f5f64217ef4b18f458c6ab
#9 resolve docker.io/library/nginx:stable-alpine@sha256:15e96e59aa3b0aada3a121296e3bce117721f42d88f5f64217ef4b18f458c6ab done
#9 sha256:15e96e59aa3b0aada3a121296e3bce117721f42d88f5f64217ef4b18f458c6ab 10.32kB / 10.32kB done
#9 sha256:589002ba0eaed121a1dbf42f6648f29e5be55d5c8a6ee0f8eaa0285cc21ac153 3.86MB / 3.86MB 0.1s done
#9 sha256:800b59f22ca0c2fb024895ba7e8c8abee4ea67b17795de3ca090e9c5a41f0b6b 1.83MB / 1.83MB 0.2s done
#9 sha256:1ccbcb6eec868419090a21e70f9816e06371f7896ff942b56fff3ac602a3100b 625B / 625B 0.1s done
#9 sha256:68b4297e20ca0f8cd692bf948cfe7b367abd8c33c55aea134aa275e8fd8ebe03 2.49kB / 2.49kB done
#9 sha256:4a2f2d155e135721fed81272e0b8c622d5d9f0a52dc23b8704f20016c514f747 11.64kB / 11.64kB done
#9 extracting sha256:589002ba0eaed121a1dbf42f6648f29e5be55d5c8a6ee0f8eaa0285cc21ac153 0.1s done
#9 sha256:7d613b3ef0c9ba47c3eab3ef85998a95778e3903dec4a4caa933e47bd43ab27e 957B / 957B 0.2s done
#9 sha256:9239ea08142fe3fc35f562163ffbbaff7ae751784bab38e546f2bc97f263c7e1 405B / 405B 0.2s done
#9 sha256:8c0ebebf0171f6ef9e715128b3d4313371b49815660fd047af40d554f556eb74 1.21kB / 1.21kB 0.3s done
#9 extracting sha256:800b59f22ca0c2fb024895ba7e8c8abee4ea67b17795de3ca090e9c5a41f0b6b 0.0s done
#9 sha256:06400c1243d8595e971b4d7af623d9b0813b26a42e93cce4f35215ad0f861e6b 1.40kB / 1.40kB 0.3s done
#9 sha256:eeece45bc9a6448ea168f47e41ad8ce3815d3d5c36914e79c59464a176991cda 20.24MB / 20.24MB 0.5s done
#9 extracting sha256:1ccbcb6eec868419090a21e70f9816e06371f7896ff942b56fff3ac602a3100b done
#9 extracting sha256:7d613b3ef0c9ba47c3eab3ef85998a95778e3903dec4a4caa933e47bd43ab27e done
#9 extracting sha256:9239ea08142fe3fc35f562163ffbbaff7ae751784bab38e546f2bc97f263c7e1 done
#9 extracting sha256:8c0ebebf0171f6ef9e715128b3d4313371b49815660fd047af40d554f556eb74 done
#9 extracting sha256:06400c1243d8595e971b4d7af623d9b0813b26a42e93cce4f35215ad0f861e6b done
#9 extracting sha256:eeece45bc9a6448ea168f47e41ad8ce3815d3d5c36914e79c59464a176991cda 0.4s done
#9 DONE 1.1s

#10 [stage-1 2/3] COPY nginx.conf /etc/nginx/nginx.conf
#10 DONE 0.0s

#8 [build 1/6] FROM docker.io/library/node:22-alpine@sha256:e4bf2a82ad0a4037d28035ae71529873c069b13eb0455466ae0bc13363826e34
#8 extracting sha256:8d513d1f314d3646adaf156be912f8de408c740e43d90cad5ce06b9de27e7bdf 1.4s done
#8 extracting sha256:2b752f7c71fd1a08980fdf09b7379d8304c8ef2569526934a2089ed26d771778
#8 extracting sha256:2b752f7c71fd1a08980fdf09b7379d8304c8ef2569526934a2089ed26d771778 0.0s done
#8 extracting sha256:fc1c5222d85fe45cd255019912158424888b168c8413fb42c8e166c37f1833eb done
#8 DONE 2.6s

#11 [build 2/6] WORKDIR /app
#11 DONE 0.0s

#12 [build 3/6] COPY package.json package-lock.json ./
#12 DONE 0.0s

#13 [build 4/6] RUN npm ci
#13 2.822 npm warn deprecated @hey-api/client-axios@0.9.1: Starting with v0.73.0, this package is bundled directly inside @hey-api/openapi-ts.
#13 8.063 
#13 8.063 > marketscrape-ui@0.0.0 postinstall
#13 8.063 > openapi-ts
#13 8.063 
#13 8.746 @hey-api/openapi-ts v0.93.1
#13 8.746 
#13 8.747 [Job 1] ❗️ Found 2 configuration errors:
#13 8.747 [Job 1]   [1] missing input - which OpenAPI specification should we use to generate your output?
#13 8.747 [Job 1]   [2] missing output - where should we generate your output?
#13 8.749 Unexpected error: ConfigValidationError: Found 2 configuration errors.
#13 8.749     at createClient (file:///app/node_modules/@hey-api/openapi-ts/dist/src-DRRrhVf_.mjs:183:38)
#13 8.749     at async Command.<anonymous> (file:///app/node_modules/@hey-api/openapi-ts/dist/run.mjs:38:8)
#13 8.749     at async Command.parseAsync (/app/node_modules/commander/lib/command.js:1122:5)
#13 8.749     at async runCli (file:///app/node_modules/@hey-api/openapi-ts/dist/run.mjs:42:3) {
#13 8.749   errors: [
#13 8.749     {
#13 8.749       error: ConfigError: missing input - which OpenAPI specification should we use to generate your output?
#13 8.749           at file:///app/node_modules/@hey-api/openapi-ts/dist/init-CuDouDN2.mjs:14081:45
#13 8.749           at Array.map (<anonymous>)
#13 8.749           at validateJobs (file:///app/node_modules/@hey-api/openapi-ts/dist/init-CuDouDN2.mjs:14078:14)
#13 8.749           at resolveJobs (file:///app/node_modules/@hey-api/openapi-ts/dist/init-CuDouDN2.mjs:14116:23)
#13 8.749           at async createClient (file:///app/node_modules/@hey-api/openapi-ts/dist/src-DRRrhVf_.mjs:171:20)
#13 8.749           at async Command.<anonymous> (file:///app/node_modules/@hey-api/openapi-ts/dist/run.mjs:38:8)
#13 8.749           at async Command.parseAsync (/app/node_modules/commander/lib/command.js:1122:5)
#13 8.749           at async runCli (file:///app/node_modules/@hey-api/openapi-ts/dist/run.mjs:42:3),
#13 8.749       jobIndex: 0
#13 8.749     },
#13 8.749     {
#13 8.749       error: ConfigError: missing output - where should we generate your output?
#13 8.749           at file:///app/node_modules/@hey-api/openapi-ts/dist/init-CuDouDN2.mjs:14082:44
#13 8.749           at Array.map (<anonymous>)
#13 8.749           at validateJobs (file:///app/node_modules/@hey-api/openapi-ts/dist/init-CuDouDN2.mjs:14078:14)
#13 8.749           at resolveJobs (file:///app/node_modules/@hey-api/openapi-ts/dist/init-CuDouDN2.mjs:14116:23)
#13 8.749           at async createClient (file:///app/node_modules/@hey-api/openapi-ts/dist/src-DRRrhVf_.mjs:171:20)
#13 8.749           at async Command.<anonymous> (file:///app/node_modules/@hey-api/openapi-ts/dist/run.mjs:38:8)
#13 8.749           at async Command.parseAsync (/app/node_modules/commander/lib/command.js:1122:5)
#13 8.749           at async runCli (file:///app/node_modules/@hey-api/openapi-ts/dist/run.mjs:42:3),
#13 8.749       jobIndex: 0
#13 8.749     }
#13 8.749   ]
#13 8.749 }
#13 8.765 npm error code 1
#13 8.765 npm error path /app
#13 8.765 npm error command failed
#13 8.765 npm error command sh -c openapi-ts
#13 8.766 npm notice
#13 8.766 npm notice New major version of npm available! 10.9.4 -> 11.11.0
#13 8.766 npm notice Changelog: https://github.com/npm/cli/releases/tag/v11.11.0
#13 8.766 npm notice To update run: npm install -g npm@11.11.0
#13 8.766 npm notice
#13 8.766 npm error A complete log of this run can be found in: /root/.npm/_logs/2026-03-05T23_29_39_013Z-debug-0.log
#13 ERROR: process "/bin/sh -c npm ci" did not complete successfully: exit code: 1
------
 > [build 4/6] RUN npm ci:
8.765 npm error code 1
8.765 npm error path /app
8.765 npm error command failed
8.765 npm error command sh -c openapi-ts
8.766 npm notice
8.766 npm notice New major version of npm available! 10.9.4 -> 11.11.0
8.766 npm notice Changelog: https://github.com/npm/cli/releases/tag/v11.11.0
8.766 npm notice To update run: npm install -g npm@11.11.0
8.766 npm notice
8.766 npm error A complete log of this run can be found in: /root/.npm/_logs/2026-03-05T23_29_39_013Z-debug-0.log
------
Dockerfile:6
--------------------
   4 |     
   5 |     COPY package.json package-lock.json ./
   6 | >>> RUN npm ci
   7 |     
   8 |     COPY . .
--------------------
ERROR: failed to build: failed to solve: process "/bin/sh -c npm ci" did not complete successfully: exit code: 1
Reference
Check build summary support
Error: buildx failed with: ERROR: failed to build: failed to solve: process "/bin/sh -c npm ci" did not complete successfully: exit code: 1