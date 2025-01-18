import * as cdk from 'aws-cdk-lib';
import { IConstruct } from 'constructs';
import {
  EXCLUDED_PREFIX_NAMES,
  EXCLUDED_RESOURCE_TYPES,
  EXCLUDED_RESOURCE_AND_NAME_PATTERNS,
  CONTAINING_STACK_NAME_RESOURCES,
} from './excluded-resource-types';

export class CdkMentor implements cdk.IAspect {
  public visit(node: IConstruct): void {
    if (node instanceof cdk.CfnResource) {
      const fullPath = node.node.path;
      const constructId = this.extractConstructId(fullPath);

      /**
       * Restrict Construct ID names to PascalCase
       * Rule001
       */
      if (constructId && !this.isPascalCase(constructId)) {
        // Exclude specific AWS resources
        if (
          !EXCLUDED_RESOURCE_TYPES.has(node.cfnResourceType) &&
          !EXCLUDED_PREFIX_NAMES.some((prefix) => constructId.startsWith(prefix)) &&
          !EXCLUDED_RESOURCE_AND_NAME_PATTERNS.some(
            (rule) => node.cfnResourceType === rule.resourceType && constructId.includes(rule.namePattern),
          )
        ) {
          cdk.Annotations.of(node).addError(`[ERR:001]: Construct ID "${constructId}"should be defined in PascalCase.`);
        }
      }

      /**
       * Do not include the words "Stack" or "Construct" in the Construct ID names
       */
      if (constructId && constructId.includes('Stack') && !CONTAINING_STACK_NAME_RESOURCES.has(node.cfnResourceType)) {
        // MEMO: Exclude if it is a CrossStack reference
        // If the stack has CrossStack references and the resource is referencing another stack, exclude it
        const stack = cdk.Stack.of(node);
        const stackDependencies = (stack as any)._stackDependencies;
        // If it is not a CrossStack reference, immediately WARN
        if (stackDependencies && Object.keys(stackDependencies).length === 0) {
          cdk.Annotations.of(node).addWarning(
            `[WARN:001]: Construct ID names should NOT include the word "Stack" "${constructId}". The Stack concept from CDK is reflected in the resource names.`,
          );
        }
        // Exclude if it is a CrossStack reference and the referenced stack name is included.
        // Otherwise, WARN.
        if (
          stackDependencies &&
          Object.keys(stackDependencies).length > 0 &&
          !constructId.includes(this.getJsonRootKey(stackDependencies))
        ) {
          cdk.Annotations.of(node).addWarning(
            `[WARN:001]: Construct ID names should NOT include the word "Stack" "${constructId}". The Stack concept from CDK is reflected in the resource names.`,
          );
        }
      }

      if (constructId && constructId.includes('Construct')) {
        cdk.Annotations.of(node).addWarning(
          `[WARN:002]: Construct ID names should NOT include the word "Construct" "${constructId}". The Construct concept from CDK is reflected in the resource names.`,
        );
      }
    }

    if (node instanceof cdk.Stack) {
      /**
       * Issue a warning for cross-stack references
       */
      // HACK: Retrieve stack dependencies via reflection
      const stackDependencies = (node as any)._stackDependencies;
      if (stackDependencies && Object.keys(stackDependencies).length > 0) {
        cdk.Annotations.of(node).addWarning(`[WARN:003]: This ${node} stack may cause CrossStack references.`);
      }
    }
  }

  private getJsonRootKey(obj: any): string {
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      const entries = Object.entries(obj);
      return entries.length > 0 ? entries[0][0] : '';
    }
    return '';
  }

  private isPascalCase(str: string): boolean {
    // Regular expression that matches a string starting with an uppercase letter,
    // containing at least one lowercase letter, and the rest being alphanumeric characters
    return /^[A-Z][a-zA-Z0-9]*[a-z][a-zA-Z0-9]*$/.test(str);
  }

  private extractConstructId(fullPath: string): string {
    const parts = fullPath.split('/');

    // If it ends with 'Resource', return the part just before it
    if (parts[parts.length - 1] === 'Resource') {
      const res = parts[parts.length - 2];
      return res;
    }

    // Otherwise, return the last part
    const res = parts[parts.length - 1];
    return res;
  }
}
