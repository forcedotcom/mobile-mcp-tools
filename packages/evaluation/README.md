# LWC Generation - Evaluation

Components and datasets related to generating LWCs from user prompts, destined for evaluating model performance, go here.

## Eval data components

Each eval data component directory hierarchy should live under `dataset/${sub_package_name}/` like `dataset/mobile-web/` for mobile-web sub project related evaluation, and adhere to the following structure:

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
