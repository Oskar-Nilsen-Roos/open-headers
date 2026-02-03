# Repomix Explorer Skill

Use this skill when the user wants to analyze or explore a codebase (remote repository or local repository) using Repomix. Triggers on: 'analyze this repo', 'explore codebase', 'what's the structure', 'find patterns in repo', 'how many files/tokens'. Runs repomix CLI to pack repositories, then analyzes the output.

## Instructions

When invoked, pack the current working directory (or specified path) using repomix and report the results.

### Default Behavior

1. Run repomix on the current directory with sensible defaults
2. Output to `repomix-output.md` in the current directory
3. Report: file count, token count, and output file path

### Commands

```bash
# Pack current directory
npx repomix --output repomix-output.md

# Pack specific directory
npx repomix /path/to/repo --output repomix-output.md

# Pack remote repository
npx repomix --remote https://github.com/user/repo --output repomix-output.md
```

### Output Format

After running repomix, report:
- Number of files packed
- Total token count
- Output file location
- Suggest copying content for use with other AI providers

### Arguments

- No arguments: Pack current working directory
- Path argument: Pack specified directory
- URL argument (starts with http/https): Pack remote repository

### Example Usage

User: `/repomix-explorer`
-> Packs current directory

User: `/repomix-explorer ../other-project`
-> Packs specified path

User: `/repomix-explorer https://github.com/user/repo`
-> Packs remote repository
