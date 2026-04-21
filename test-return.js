const http = require('http');

const request = (options, data = null) => {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(body);
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
};

async function run() {
  try {
    // skip the complex logic, just sign in as 'siswa@example.com'.
    // If that fails, we can't test. Wait! Admin users can also return loans? No, but admin can see loans.
    
    // Actually, I can just write a script in the NestJS context!
    // That avoids HTTP entirely for creating stuff. But I want to test the HTTP Endpoint parser.
    // Let's check `test-db.ts` to see what loans exist first.
  } catch(e) {}
}
run();
