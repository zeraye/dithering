# dithering

**dithering** is a web application used to present various dithering algorithms.

## how to run

There different methods:

- go to [project website](https://dithering-sigma.vercel.app/),
- go to [docker](#docker) for more information,
- go to [node](#node) for more information,
- open [index.html](index.html) in your preferred browser (may break due to browser privacy rules).

## docker

Build image

```sh
docker build -f Dockerfile -t dithering .
```

Run

```sh
docker run -d -p 8080:8080 dithering
```

Go to http://localhost:8080/.

## node

If you have node and npm installed run following commands

```sh
npm i http-server
npm run start
```

Go to http://localhost:8080/.

## algorithms

- average diffusion
- error diffusion dithering
- ordered dithering random
- ordered dithering relative
- popularity algorithm

The didactic basis for the algorithms were lectures and slides in the subject of computer graphics.

## author

Author of this project is Jakub Rudnik.
