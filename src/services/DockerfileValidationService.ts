import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export class DockerfileValidationService {
  
  async validateDockerfile(dockerfile: string): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];
    
    try {
      // Basic syntax validation
      const syntaxValidation = await this.validateSyntax(dockerfile);
      errors.push(...syntaxValidation.errors);
      warnings.push(...syntaxValidation.warnings);
      
      // Security validation
      const securityValidation = await this.validateSecurity(dockerfile);
      errors.push(...securityValidation.errors);
      warnings.push(...securityValidation.warnings);
      suggestions.push(...securityValidation.suggestions);
      
      // Best practices validation
      const bestPracticesValidation = await this.validateBestPractices(dockerfile);
      warnings.push(...bestPracticesValidation.warnings);
      suggestions.push(...bestPracticesValidation.suggestions);
      
      // Performance validation
      const performanceValidation = await this.validatePerformance(dockerfile);
      warnings.push(...performanceValidation.warnings);
      suggestions.push(...performanceValidation.suggestions);
      
      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        suggestions
      };
      
    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        suggestions: []
      };
    }
  }
  
  private async validateSyntax(dockerfile: string): Promise<{ errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    const lines = dockerfile.split('\n');
    let inMultiLine = false;
    let multiLineCommand = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineNumber = i + 1;
      
      // Skip empty lines and comments
      if (!line || line.startsWith('#')) continue;
      
      // Handle multi-line commands
      if (line.endsWith('\\')) {
        if (!inMultiLine) {
          inMultiLine = true;
          multiLineCommand = line.slice(0, -1);
        } else {
          multiLineCommand += ' ' + line.slice(0, -1);
        }
        continue;
      }
      
      if (inMultiLine) {
        multiLineCommand += ' ' + line;
        inMultiLine = false;
      }
      
      const commandLine = inMultiLine ? multiLineCommand : line;
      
      // Validate Dockerfile instructions
      const validInstructions = [
        'FROM', 'RUN', 'CMD', 'LABEL', 'MAINTAINER', 'EXPOSE', 'ENV', 'ADD', 'COPY',
        'ENTRYPOINT', 'VOLUME', 'USER', 'WORKDIR', 'ARG', 'ONBUILD', 'STOPSIGNAL',
        'HEALTHCHECK', 'SHELL'
      ];
      
      const instruction = commandLine.split(' ')[0];
      if (instruction && !validInstructions.includes(instruction)) {
        errors.push(`Line ${lineNumber}: Invalid instruction '${instruction}'`);
      }
      
      // Validate FROM instruction
      if (instruction === 'FROM') {
        const parts = commandLine.split(' ');
        if (parts.length < 2) {
          errors.push(`Line ${lineNumber}: FROM instruction requires a base image`);
        } else {
          const baseImage = parts[1];
          if (baseImage.includes(':')) {
            const [image, tag] = baseImage.split(':');
            if (!tag || tag === 'latest') {
              warnings.push(`Line ${lineNumber}: Consider using a specific tag instead of 'latest'`);
            }
          } else {
            warnings.push(`Line ${lineNumber}: Consider using a specific tag for the base image`);
          }
        }
      }
      
      // Validate COPY/ADD instructions
      if (instruction === 'COPY' || instruction === 'ADD') {
        const parts = commandLine.split(' ');
        if (parts.length < 3) {
          errors.push(`Line ${lineNumber}: ${instruction} instruction requires source and destination`);
        } else {
          // Check for wildcard usage
          const source = parts[1];
          if (source.includes('*') && !source.includes('node_modules')) {
            warnings.push(`Line ${lineNumber}: Wildcard usage in ${instruction} may copy unnecessary files`);
          }
        }
      }
      
      // Validate EXPOSE instruction
      if (instruction === 'EXPOSE') {
        const parts = commandLine.split(' ');
        if (parts.length < 2) {
          errors.push(`Line ${lineNumber}: EXPOSE instruction requires a port number`);
        } else {
          const port = parts[1];
          // Allow numeric ports, ports with protocol, and environment variables
          if (!/^\d+$/.test(port) && !/^\d+\/tcp$/.test(port) && !/^\d+\/udp$/.test(port) && !/^\$\w+$/.test(port)) {
            errors.push(`Line ${lineNumber}: Invalid port format '${port}'`);
          }
        }
      }
      
      // Validate RUN instruction
      if (instruction === 'RUN') {
        const runCommand = commandLine.substring(4).trim();
        if (runCommand.startsWith('apt-get update') && !runCommand.includes('apt-get clean')) {
          warnings.push(`Line ${lineNumber}: Consider adding 'apt-get clean' after 'apt-get update'`);
        }
        if (runCommand.includes('npm install') && !runCommand.includes('--production')) {
          warnings.push(`Line ${lineNumber}: Consider using 'npm ci --only=production' for production builds`);
        }
      }
    }
    
    return { errors, warnings };
  }
  
  private async validateSecurity(dockerfile: string): Promise<{ errors: string[]; warnings: string[]; suggestions: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];
    
    const lines = dockerfile.split('\n');
    
    // Check for root user usage
    let hasUserInstruction = false;
    let hasFromInstruction = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineNumber = i + 1;
      
      if (line.startsWith('FROM')) {
        hasFromInstruction = true;
      }
      
      if (line.startsWith('USER')) {
        hasUserInstruction = true;
        const user = line.split(' ')[1];
        if (user === 'root' || user === '0') {
          errors.push(`Line ${lineNumber}: Running as root user is a security risk`);
        }
      }
      
      if (line.startsWith('RUN') && line.includes('sudo')) {
        warnings.push(`Line ${lineNumber}: Using sudo in RUN instruction may indicate security issues`);
      }
      
      if (line.startsWith('COPY') && line.includes('--chown=root:root')) {
        warnings.push(`Line ${lineNumber}: Copying files with root ownership may cause security issues`);
      }
    }
    
    if (hasFromInstruction && !hasUserInstruction) {
      warnings.push('No USER instruction found - container will run as root');
      suggestions.push('Add a USER instruction to run as non-root user for better security');
    }
    
    // Check for secrets in Dockerfile
    const secretPatterns = [
      /password/i,
      /secret/i,
      /key/i,
      /token/i,
      /api[_-]?key/i
    ];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;
      
      for (const pattern of secretPatterns) {
        if (pattern.test(line) && !line.startsWith('#')) {
          warnings.push(`Line ${lineNumber}: Potential secret detected - consider using build args or secrets`);
        }
      }
    }
    
    return { errors, warnings, suggestions };
  }
  
  private async validateBestPractices(dockerfile: string): Promise<{ warnings: string[]; suggestions: string[] }> {
    const warnings: string[] = [];
    const suggestions: string[] = [];
    
    const lines = dockerfile.split('\n');
    let hasWorkdir = false;
    let hasExpose = false;
    let hasHealthcheck = false;
    let hasLabel = false;
    let hasMultiStage = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineNumber = i + 1;
      
      if (line.startsWith('WORKDIR')) {
        hasWorkdir = true;
      }
      
      if (line.startsWith('EXPOSE')) {
        hasExpose = true;
      }
      
      if (line.startsWith('HEALTHCHECK')) {
        hasHealthcheck = true;
      }
      
      if (line.startsWith('LABEL')) {
        hasLabel = true;
      }
      
      if (line.startsWith('FROM') && line.includes('AS')) {
        hasMultiStage = true;
      }
      
      if (line.startsWith('RUN') && line.includes('&&')) {
        const runCommands = line.split('&&');
        if (runCommands.length > 3) {
          warnings.push(`Line ${lineNumber}: Long RUN command with multiple && operators - consider splitting`);
        }
      }
      
      if (line.startsWith('COPY') && line.includes('node_modules')) {
        warnings.push(`Line ${lineNumber}: Copying node_modules may cause issues - consider using .dockerignore`);
      }
    }
    
    if (!hasWorkdir) {
      suggestions.push('Consider adding a WORKDIR instruction to set the working directory');
    }
    
    if (!hasExpose) {
      suggestions.push('Consider adding an EXPOSE instruction to document the port');
    }
    
    if (!hasHealthcheck) {
      suggestions.push('Consider adding a HEALTHCHECK instruction for better container monitoring');
    }
    
    if (!hasLabel) {
      suggestions.push('Consider adding LABEL instructions for metadata');
    }
    
    if (!hasMultiStage) {
      suggestions.push('Consider using multi-stage builds to reduce image size');
    }
    
    return { warnings, suggestions };
  }
  
  private async validatePerformance(dockerfile: string): Promise<{ warnings: string[]; suggestions: string[] }> {
    const warnings: string[] = [];
    const suggestions: string[] = [];
    
    const lines = dockerfile.split('\n');
    let copyOrder = 0;
    let runOrder = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineNumber = i + 1;
      
      if (line.startsWith('COPY')) {
        copyOrder++;
        const source = line.split(' ')[1];
        if (source === 'package.json' || source === 'package-lock.json') {
          if (copyOrder > 1) {
            warnings.push(`Line ${lineNumber}: package.json should be copied before other files for better caching`);
          }
        }
      }
      
      if (line.startsWith('RUN')) {
        runOrder++;
        if (line.includes('npm install') && runOrder === 1) {
          // This is good
        } else if (line.includes('npm install') && runOrder > 1) {
          warnings.push(`Line ${lineNumber}: npm install should be done early for better layer caching`);
        }
      }
      
      if (line.startsWith('FROM') && line.includes('alpine')) {
        // Alpine is good for performance
      } else if (line.startsWith('FROM') && !line.includes('alpine')) {
        suggestions.push(`Line ${lineNumber}: Consider using Alpine Linux for smaller image size`);
      }
    }
    
    return { warnings, suggestions };
  }
  
  async validateWithDockerLint(dockerfile: string): Promise<ValidationResult> {
    try {
      // Try to use hadolint if available
      const { stdout } = await execAsync(`echo '${dockerfile.replace(/'/g, "'\\''")}' | hadolint -`);
      const lines = stdout.split('\n').filter(line => line.trim());
      
      const errors: string[] = [];
      const warnings: string[] = [];
      
      for (const line of lines) {
        if (line.includes('DL')) {
          const match = line.match(/DL(\d+)/);
          if (match) {
            const code = match[1];
            const severity = this.getHadolintSeverity(code);
            const message = line.substring(line.indexOf(':') + 1).trim();
            
            if (severity === 'error') {
              errors.push(message);
            } else {
              warnings.push(message);
            }
          }
        }
      }
      
      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        suggestions: []
      };
      
    } catch (error) {
      // hadolint not available, fall back to basic validation
      return await this.validateDockerfile(dockerfile);
    }
  }
  
  private getHadolintSeverity(code: string): 'error' | 'warning' | 'info' {
    const errorCodes = ['DL3000', 'DL3001', 'DL3002', 'DL3003', 'DL3004', 'DL3005'];
    const warningCodes = ['DL3006', 'DL3007', 'DL3008', 'DL3009', 'DL3010'];
    
    if (errorCodes.some(c => code.startsWith(c))) {
      return 'error';
    } else if (warningCodes.some(c => code.startsWith(c))) {
      return 'warning';
    } else {
      return 'info';
    }
  }
}
