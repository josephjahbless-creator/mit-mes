const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const certsDir = path.join(__dirname, '../certs');
if (!fs.existsSync(certsDir)) fs.mkdirSync(certsDir, { recursive: true });

// Use Node.js built-in crypto to generate self-signed cert
const { generateKeyPairSync, createSign } = require('crypto');
const forge = require('node-forge');

const keys = forge.pki.rsa.generateKeyPair(2048);
const cert = forge.pki.createCertificate();

cert.publicKey = keys.publicKey;
cert.serialNumber = '01';
cert.validity.notBefore = new Date();
cert.validity.notAfter = new Date();
cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 10);

const attrs = [
  { name: 'countryName', value: 'TZ' },
  { name: 'stateOrProvinceName', value: 'Dodoma' },
  { name: 'localityName', value: 'Dodoma' },
  { name: 'organizationName', value: 'MIT Tanzania' },
  { shortName: 'OU', value: 'ME' },
  { name: 'commonName', value: '192.168.0.126' },
];
cert.setSubject(attrs);
cert.setIssuer(attrs);
cert.setExtensions([
  { name: 'basicConstraints', cA: true },
  { name: 'keyUsage', keyCertSign: true, digitalSignature: true, nonRepudiation: true, keyEncipherment: true, dataEncipherment: true },
  { name: 'extKeyUsage', serverAuth: true },
  { name: 'subjectAltName', altNames: [
    { type: 7, ip: '192.168.0.126' },
    { type: 7, ip: '127.0.0.1' },
  ]},
]);

cert.sign(keys.privateKey, forge.md.sha256.create());

fs.writeFileSync(path.join(certsDir, 'cert.pem'), forge.pki.certificateToPem(cert));
fs.writeFileSync(path.join(certsDir, 'key.pem'),  forge.pki.privateKeyToPem(keys.privateKey));
console.log('Certificates generated at', certsDir);
