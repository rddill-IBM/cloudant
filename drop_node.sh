#!/bin/bash

declare -a FOLDERS=($( */))

for i in "${FOLDERS[@]}"
do
   echo " dropping node_modules from $i"
   pushd $i
   echo " now in " pwd
   if [[ -d 'node_modules' ]]; then
   rm -r node_modules 
   fi
   popd
done