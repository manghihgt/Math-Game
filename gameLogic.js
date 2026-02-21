const generateOptions = (correct) => {
    const options = new Set();
    options.add(correct);
    while (options.size < 4) {
        const offset = Math.floor(Math.random() * 20) - 10;
        const op = correct + (offset === 0 ? 5 : offset);
        if (op >= 0) options.add(op);
    }
    return Array.from(options).sort(() => Math.random() - 0.5);
};

const generateArithmeticSequence = () => {
    // User requested a1, d logic
    const a1 = Math.floor(Math.random() * 15) + 1; // Start from 1-15
    const d = Math.floor(Math.random() * 10) + 2;  // Step of 2-11

    // Create sequence of 5 numbers
    const seq = [a1, a1 + d, a1 + d * 2, a1 + d * 3, a1 + d * 4];
    const missingIdx = Math.floor(Math.random() * 5);
    const answer = seq[missingIdx];

    const displaySeq = [...seq];
    displaySeq[missingIdx] = '...';

    return {
        question: `Find the missing number: ${displaySeq.join(', ')}`,
        options: generateOptions(answer),
        answer
    };
};

const generateQuestion = () => {
    return generateArithmeticSequence();
};

module.exports = { generateQuestion };
