# PerimeterX Dynamic Challenge Extractor
The PerimeterX Dynamic Challenge Extractor is a quick solution designed to address the challenge of dynamic script obfuscation employed by PerimeterX. This tool specifically targets and extracts the dynamic challenge function required for the parameter `PX12573` from the second payload identified as `PX11590`.

![Banner](img/banner.jpg)

PerimeterX frequently updates their scripts, changing variable and function names as well as the dynamic functions. However, the structure remains consistent, which is where this extractor utility comes in.

## Dynamic Function Structure
The dynamic functions targeted by this extractor follow a specific pattern:
```js
function (a, b, c) {
    // Operations on 'a' (the sts value), with a random number, and 'b' or 'c' using charCodeAt on a random index.
}
```
When using the extracted function, you will need to pass three arguments:

1. **First Argument** `Math.floor(parseInt(firstResponse.sts) / 1e3)`
2. **Second Argument** The sts value from the first response (i.e., `firstResponse.sts`)
3. **Third Argument** Your `uuid` value

## Usage
Once you've initialized an instance of the `DynamicChallengeExtractor` with the path to your script, you'll have access to the `obj.builder` function. This function is dynamically evaluated and ready to be called with the three arguments outlined above.

Here's how you can use it:
```js
const DynamicChallengeExtractor = require('./DynamicChallengeExtractor');
let obj = new DynamicChallengeExtractor('./script.js');
let dynamicValue = obj.builder(firstArgument, secondArgument, thirdArgument);
```
This `dynamicValue` will be the output of the dynamically extracted function, computed using the provided arguments.

## Features
- **Extraction of Dynamic Functions** Analyzes the script and extracts all potential functions that match the dynamic challenge pattern.
- **Decryption and Identification** Decrypts obfuscated code to identify the correct function to execute.
- **Evaluation in a Safe Environment** Executes the identified function within a virtual machine (VM) to ensure safe evaluation.
- **Ready-to-use Function** After the extraction and identification process, the resultant function is immediately available for use through obj.builder.

## Example log output
```
22:32:24:294 | 1. Extracted 10 possible functions, and found "ao" as the checker function.
22:32:24:370 | 2. Found decryption function name: La
22:32:24:514 | 3. Found list function name: "Ya", extracted the code and shuffled
22:32:24:515 | 4. Identified 8mcHYy81 as the right builder function
22:32:24:515 | Extracted function code: 
function (s, y, i) {
  return (s + 376) / y.charCodeAt(22);
}
```

## Quick Start
Run the extractor from the command line:
```bash
node main.js <script file path, default script.js>
```

You can find in [script.js](./script.js) a sample perimeterX script that you can use to test the extractor (v8.7.2).

## Connect

This project is a quick and nimble solution crafted out of necessity. For more insights, follow my journey and connect with me on social platforms:

- GitHub: [@glizzykingdreko](https://github.com/glizzykingdreko)
- Medium: [@glizzykingdreko](https://medium.com/@glizzykingdreko)
- CodePen: [@glizzykingdreko](https://codepen.io/glizzykingdreko)
- Twitter: [@glizzykingdreko](https://twitter.com/glizzykingdreko)

For direct communication, shoot an email to [glizzykingdreko@protonmail.com](mailto:glizzykingdreko@protonmail.com).
