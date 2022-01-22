import {
	Uniform,
} from "./types";

import {
	isVec2,
	isVec3,
	isMat4,
	isColor,
} from "./math";

// vertex shader template, replace {{user}} with user vertex shader code
const VERT_TEMPLATE = `
attribute vec3 a_pos;
attribute vec2 a_uv;
attribute vec4 a_color;

varying vec3 v_pos;
varying vec2 v_uv;
varying vec4 v_color;

uniform mat4 u_transform;

vec4 def_vert() {
	return u_transform * vec4(a_pos, 1.0);
}

{{user}}

void main() {
	vec4 pos = vert(a_pos, a_uv, a_color);
	v_pos = a_pos;
	v_uv = a_uv;
	v_color = a_color;
	gl_Position = pos;
}
`;

// fragment shader template, replace {{user}} with user fragment shader code
const FRAG_TEMPLATE = `
precision mediump float;

varying vec3 v_pos;
varying vec2 v_uv;
varying vec4 v_color;

uniform sampler2D u_tex;

vec4 def_frag() {
	return v_color * texture2D(u_tex, v_uv);
}

{{user}}

void main() {
	gl_FragColor = frag(v_pos, v_uv, v_color, u_tex);
	if (gl_FragColor.a == 0.0) {
		discard;
	}
}
`;

// default {{user}} vertex shader code
const DEF_VERT = `
vec4 vert(vec3 pos, vec2 uv, vec4 color) {
	return def_vert();
}
`;

// default {{user}} fragment shader code
const DEF_FRAG = `
vec4 frag(vec3 pos, vec2 uv, vec4 color, sampler2D tex) {
	return def_frag();
}
`;

export class Shader {

	private gl: WebGLRenderingContext;
	private glProgram: WebGLProgram;

	constructor(
		gl: WebGLRenderingContext,
		vertSrc: string | null = DEF_VERT,
		fragSrc: string | null = DEF_FRAG,
	) {

		this.gl = gl;

		let msg;
		const vcode = VERT_TEMPLATE.replace("{{user}}", vertSrc ?? DEF_VERT);
		const fcode = FRAG_TEMPLATE.replace("{{user}}", fragSrc ?? DEF_FRAG);
		const vertShader = gl.createShader(gl.VERTEX_SHADER);
		const fragShader = gl.createShader(gl.FRAGMENT_SHADER);

		gl.shaderSource(vertShader, vcode);
		gl.shaderSource(fragShader, fcode);
		gl.compileShader(vertShader);
		gl.compileShader(fragShader);

		if ((msg = gl.getShaderInfoLog(vertShader))) {
			throw new Error(msg);
		}

		if ((msg = gl.getShaderInfoLog(fragShader))) {
			throw new Error(msg);
		}

		this.glProgram = gl.createProgram();

		gl.attachShader(this.glProgram, vertShader);
		gl.attachShader(this.glProgram, fragShader);

		gl.bindAttribLocation(this.glProgram, 0, "a_pos");
		gl.bindAttribLocation(this.glProgram, 1, "a_uv");
		gl.bindAttribLocation(this.glProgram, 2, "a_color");

		gl.linkProgram(this.glProgram);

		if ((msg = gl.getProgramInfoLog(this.glProgram))) {
			// for some reason on safari it always has a "\n" msg
			if (msg !== "\n") {
				throw new Error(msg);
			}
		}

	}

	bind() {
		this.gl.useProgram(this.glProgram);
	};

	unbind() {
		this.gl.useProgram(null);
	};

	send(uniform: Uniform) {
		const gl = this.gl;
		for (const name in uniform) {
			const val = uniform[name];
			const loc = gl.getUniformLocation(this.glProgram, name);
			if (typeof val === "number") {
				gl.uniform1f(loc, val);
			} else if (isMat4(val)) {
				// @ts-ignore
				gl.uniformMatrix4fv(loc, false, new Float32Array(val.m));
			} else if (isColor(val)) {
				// @ts-ignore
				gl.uniform4f(loc, val.r, val.g, val.b, val.a);
			} else if (isVec3(val)) {
				// @ts-ignore
				gl.uniform3f(loc, val.x, val.y, val.z);
			} else if (isVec2(val)) {
				// @ts-ignore
				gl.uniform2f(loc, val.x, val.y);
			}
		}
	};

}
