import { promptHandler } from './_scripts/promptHandler'
import { UIHelper } from './_scripts/UIHelper'

action({
    author: 'noellealarie',
    name: 'IMG2IMG',
    description: 'Ported from https://comfyanonymous.github.io/ComfyUI_examples/img2img/',
    help: '',
    ui: (form) => {
        const x = new UIHelper(form)
        return {
            prompt: form.group({
                label: 'Prompt',
                items: () => ({
                    ...x.prompts(),
                }),
            }),
            checkpoint: form.group({
                label: 'Checkpoint',
                items: () => ({
                    ...x.checkpoint(),
                }),
            }),
            ksampler: form.group({
                label: 'KSampler',
                items: () => ({
                    ...x.kSampler(),
                    seed: form.seed({ label: 'Seed', defaultMode: 'randomize' }),
                }),
            }),
            img2img: form.image({
                label: 'Load Image',
            }),
        }
    },
    run: async (flow, p) => {
        const graph = flow.nodes
        const checkpoint = { ...p.checkpoint }
        const ksampler = { ...p.ksampler }

        const ckpt = graph.CheckpointLoaderSimple({ ckpt_name: p.checkpoint.ckpt_name })

        let clip_model: HasSingle_CLIP & HasSingle_MODEL = ckpt

        // CLIP
        let clip: _CLIP = clip_model._CLIP
        let model: _MODEL = clip_model._MODEL

        if (p.checkpoint.clip_skip) {
            clip = graph.CLIPSetLastLayer({ clip, stop_at_clip_layer: -Math.abs(p.checkpoint.clip_skip) })
        }

        // VAE
        let vae: _VAE = ckpt._VAE
        if (p.checkpoint.vae) vae = graph.VAELoader({ vae_name: p.checkpoint.vae })

        // PROMPT
        const positive_text = promptHandler(flow, graph, clip_model, p.prompt.positive)
        const negative_text = promptHandler(flow, graph, clip_model, p.prompt.negative, false)

        // CLIPS
        const positive = graph.CLIPTextEncode({ clip: flow.AUTO, text: positive_text })
        const negative = graph.CLIPTextEncode({ clip: flow.AUTO, text: negative_text })

        // LATENT

        let LATENT = graph.KSampler({
            seed: ksampler.seed,
            latent_image: graph.VAEEncode({
                pixels: await flow.loadImageAnswer(p.img2img),
                vae: vae,
            }),
            model,
            positive: positive,
            negative: negative,
            sampler_name: ksampler.sampler,
            scheduler: ksampler.scheduler,
            denoise: ksampler.denoise,
            steps: ksampler.steps,
            cfg: ksampler.cfg,
        })

        // DECODE --------------------------------------------------------------------------------
        graph.PreviewImage({
            images: graph.VAEDecode({
                samples: LATENT,
                vae: vae, // flow.AUTO,
            }),
        })

        // PROMPT
        await flow.PROMPT()
    },
})
