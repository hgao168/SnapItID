{
  "name": "snapitid",
  "version": "0.1.0",
  "description": "Global AI Identity Photo Platform - iOS MVP",
  "license": "MIT",
  "author": {
    "name": "SnapItID Team"
  },
  "platforms": {
    "ios": "15.0"
  },
  "swift_version": "5.9",
  "products": [
    {
      "name": "SnapItID",
      "type": "app",
      "targets": ["SnapItID"]
    }
  ],
  "targets": {
    "SnapItID": {
      "type": "regular",
      "sources": ["Sources"],
      "resources": ["Resources"]
    }
  },
  "dependencies": [
    {
      "name": "Photos",
      "type": "system"
    },
    {
      "name": "Foundation",
      "type": "system"
    },
    {
      "name": "UIKit",
      "type": "system"
    }
  ]
}
