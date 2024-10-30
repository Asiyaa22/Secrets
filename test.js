import bcrypt from "bcrypt";

async function testBcrypt() {
    const plainPassword = 'testPassword123';
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    const comparisonResult = await bcrypt.compare(plainPassword, hashedPassword);
    console.log("Comparison result:", comparisonResult); // Should print `true`
}

testBcrypt();