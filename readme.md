![NPM Version](https://img.shields.io/npm/v/@rossmacd/gamesock-server?style=for-the-badge)
# Gamesock-Client
A Client-side Networking library to handle the websocket portion of drinking games built with node

## To install latest published:
`npm install @rossmacd/gamesock-server`

## To install - (For Development):
Clone the package using

`git clone https://github.com/drinking-game-app/gamesock-client.git`

Install Peer dependencies

`npm install`

Build the package - this will need to be done each time code is updated

`npm run build`

## To use the built dependency
This is a two step process to create a link between your local version of the package and the project you want to use it in.
In the folder for this dependency run:

`npm link`

In the folder of the project you would like to use it in

`npm link @rossmacd/gamesock-server`
