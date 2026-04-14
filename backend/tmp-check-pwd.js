const bcrypt = require('bcryptjs');

const hash = '$2a$10$NvNoef.drHLREdvu1gBqE.F7/17UeY3AAmRLS/7CKSvYDevBkO28y';
const passwords = [
    'love123',
    'password',
    '123456',
    '12345678',
    'love',
    'admin123',
    'manager123',
    'love@shop.com',
    'love1234',
    'love@123',
    'Love@123',
    'Love123',
    '12345',
    '1234',
    '123456789'
];

const check = async () => {
    for (let pw of passwords) {
        if (await bcrypt.compare(pw, hash)) {
            console.log('Password is:', pw);
            process.exit(0);
        }
    }
    console.log('Password not found in common list.');
};

check();
