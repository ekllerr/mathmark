// the document offered on an empty page: a short tour of what a math block can do
export const EXAMPLE = `# Projectile motion

A ball is thrown at \${ v = 20 } m/s at an angle of \${ a = pi/4 }, with gravity \${ g = 9.81 }.

## Height over time

\${ h(t) = v * sin(a) * t - 1/2 * g * t^2, plot(h(x)) }

## When does it land?

\${ solve(h(t) = 0, t) }

The peak is where the vertical speed is zero:

\${ diff(t) h(t), solve(v * sin(a) - g * t = 0, t) }

## How far does it go?

The range is \${ v^2 * sin(2 * a) / g } metres.

Click **Show results** on a block, or click a formula inside a sentence, to see its value.
`;
