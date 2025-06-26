# LWC Generation - Evaluation

Components and datasets related to generating LWCs from user prompts, destined for evaluating model performance, go here.

**Note:** Components meant to _train_/fine tune one or more models should _not_ go here! Once components have been added to the fine tuning of a given model, they're susceptible to [overfitting](https://en.wikipedia.org/wiki/Overfitting). Components meant to train model(s) should go in [../training](../training).

## Eval data components

Each eval data component directory hierarchy should live at the top level of `lwc-generation/eval`, and adhere to the following structure:

```
<Name of the LWC>/
├── prompt/
│   └── prompt.md        # The user prompt to generate this component
└── component/           # The LWC files representing the component
    ├── <LWC Name>.html
    ├── <LWC Name>.css
    ├── <LWC Name>.js
    └── <LWC Name>.js-meta.xml
```

Example:

```
myComponent/
├── prompt/
│   └── prompt.md
└── component/
    ├── myComponent.html
    ├── myComponent.css
    ├── myComponent.js
    └── myComponent.js-meta.xml
```
