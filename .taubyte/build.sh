#!/bin/bash

npm install
npm run build
mv dist/* /out
exit 0