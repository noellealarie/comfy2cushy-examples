import type { NodeBuilder } from 'src/back/NodeBuilder'
import type { Runtime } from 'src/back/Runtime'
import type { Requestable_prompt_output } from 'src/controls/InfoRequest'

export function promptHandler(
    flow: Runtime,
    graph: NodeBuilder,
    clip_model: HasSingle_CLIP & HasSingle_MODEL,
    prompt: Requestable_prompt_output,
    positive = true,
): string {
    const prompt_parts: string[] = []

    for (const tok of prompt.tokens) {
        const { type } = tok

        switch (type) {
            case 'booru':
                prompt_parts.push(` ${tok.tag.text}`)
                break
            case 'text':
                prompt_parts.push(` ${tok.text}`)
                break
            case 'embedding':
                prompt_parts.push(` embedding:${tok.embeddingName}`)
                break
            case 'wildcard':
                const options = (flow.wildcards as any)[tok.payload]
                if (Array.isArray(options)) {
                    prompt_parts.push(` ${flow.pick(options)}`)
                }
                break
            case 'lora':
                if (positive === true) {
                    clip_model = graph.LoraLoader({
                        model: clip_model,
                        clip: clip_model,
                        lora_name: tok.loraDef.name,
                        strength_clip: tok.loraDef.strength_clip,
                        strength_model: tok.loraDef.strength_model,
                    })
                }
                break
        }
    }

    return prompt_parts.join('').trim()
}
