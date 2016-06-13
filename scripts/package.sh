#!/bin/bash
PACKAGED_NODE_VERSION="v4.4.5"
NODE_VERSION=$( node --version )
COMMIT=$( node scripts/details.js COMMIT )
PACKAGE_VERSION=$( node scripts/details.js VERSION )
PACKAGE_NAME=$( node scripts/details.js NAME )
OS=$( node scripts/details.js OS )

# Clean the build directory
rm -rf build
mkdir build
mkdir build/$PACKAGE_VERSION

if [ $OS == "darwin" ]; then
	PLATFORM="mac"
elif  [ $OS == "linux" ]; then
	PLATFORM="linux"
elif  [ $OS == "win32" ]; then
	PLATFORM="windows"
else
	echo "Operating system $OS not supported for packaging"
	exit
fi

if [ $NODE_VERSION != $PACKAGED_NODE_VERSION ]; then
	echo Packaging only done on $PACKAGED_NODE_VERSION
	exit
fi

FILE_NAME=$PACKAGE_NAME-$PLATFORM-$PACKAGE_VERSION-$COMMIT

# Do a git archive and a production install
# to have cleanest output
git archive --format=zip $COMMIT -o ./build/$PACKAGE_VERSION/temp.zip
cd build/$PACKAGE_VERSION
unzip temp.zip -d $PACKAGE_NAME

cd $PACKAGE_NAME
npm install --production
echo 'Installed NPM Dependencies'

if [ $PLATFORM == 'mac' ]; then
	FILE_NAME="$FILE_NAME.zip"
	CLEAN_FILE_NAME="$PACKAGE_NAME-$PLATFORM.zip"
	zip -r ../$FILE_NAME .
elif [ $PLATFORM == 'windows' ]; then
	FILE_NAME="$FILE_NAME.zip"
	CLEAN_FILE_NAME="$PACKAGE_NAME-$PLATFORM.zip"
	7z a ../$FILE_NAME .
else
	FILE_NAME="$FILE_NAME.tar.gz"
	CLEAN_FILE_NAME="$PACKAGE_NAME-$PLATFORM.tar.gz"
	tar czf ../$FILE_NAME .
fi

cd ..
rm -rf $PACKAGE_NAME temp.zip

cp $FILE_NAME ../$CLEAN_FILE_NAME
echo 'Done'