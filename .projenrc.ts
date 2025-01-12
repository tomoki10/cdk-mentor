import { awscdk } from 'projen';
import { NodePackageManager } from 'projen/lib/javascript';
const project = new awscdk.AwsCdkConstructLibrary({
  author: 'tomoki10',
  authorAddress: 'tomoki10wakhok@gmail.com',
  cdkVersion: '2.68.0',
  defaultReleaseBranch: 'main',
  jsiiVersion: '~5.5.0',
  name: 'cdk-mentor',
  projenrcTs: true,
  repositoryUrl: 'https://github.com/tomoki10/cdk-mentor.git',
  majorVersion: 1,
  packageManager: NodePackageManager.NPM,
  license: 'MIT',

  devDeps: ['@aws-cdk/assert', '@aws-cdk/lambda-layer-kubectl-v24'],

  gitignore: ['.vscode', '**/.DS_Store'],
});
project.synth();
