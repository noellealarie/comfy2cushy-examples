import { FormBuilder } from 'src/controls/InfoRequest'

export class UIHelper {
    constructor(private form: FormBuilder) {}

    prompts = () => {
        return {
            positive: this.form.prompt({ label: 'Positive' }),
            negative: this.form.prompt({ label: 'Negative' }),
        }
    }

    checkpoint = () => {
        return {
            ckpt_name: this.form.enum({
                label: 'Checkpoint',
                enumName: 'Enum_CheckpointLoaderSimple_ckpt_name',
            }),
            vae: this.form.enumOpt({ label: 'VAE', enumName: 'Enum_VAELoader_vae_name' }),
            clip_skip: this.form.int({
                label: 'Clip Skip',
                tooltip: 'same as ClipSetLastLayer; you can use both positive and negative values',
            }),
        }
    }

    kSampler = () => {
        return {
            cfg: this.form.int({ label: 'CFG', default: 8, min: 1, theme: 'input' }),
            sampler: this.form.enum({ label: 'Sampler', enumName: 'Enum_KSampler_sampler_name' }),
            scheduler: this.form.enum({ label: 'Scheduler', enumName: 'Enum_KSampler_scheduler' }),
            denoise: this.form.float({ label: 'Denoise', default: 1, theme: 'input' }),
            steps: this.form.int({ label: 'Steps', default: 20, min: 1, theme: 'input' }),
        }
    }

    resolutionPicker = () =>
        this.form.selectOne({
            label: 'Resolution',
            choices: [
                { type: '1024x1024' },
                { type: '896x1152' },
                { type: '832x1216' },
                { type: '768x1344' },
                { type: '640x1536' },
                { type: '1152x862' },
                { type: '1216x832' },
                { type: '1344x768' },
                { type: '1536x640' },
            ],
            tooltip: 'Width x Height',
        })

    FreeU = () =>
        this.form.groupOpt({
            label: 'FreeU',
            items: () => ({
                b1: this.form.float({ default: 1.1 }),
                b2: this.form.float({ default: 1.15 }),
                s1: this.form.float({ default: 0.85 }),
                s2: this.form.float({ default: 0.35 }),
            }),
        })

    /** allow to easilly pick a shape */
    shapePicker = () => {
        return this.form.selectOne({
            label: 'Shape',
            choices: [{ type: 'round' }, { type: 'square' }],
        })
    }

    /** allow to easilly pick any shape given as parameter */
    shapePicker2 = <const T extends string>(values: T[]) => {
        return this.form.selectOne({
            label: 'Shape',
            choices: values.map((t) => ({ type: t })),
        })
    }
}
