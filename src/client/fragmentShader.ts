export default `precision lowp float;

uniform vec3 fogColor;
uniform float fogNear;
uniform float fogFar;
uniform float uLineRadius;

uniform float uMinimumAlpha;
uniform float uMaximumAlpha;
uniform vec3 uInsideColor;
uniform vec3 uOutsideColor;

varying float vAccentColor;
varying float vLineRadius;

void main()
{
        float alpha = (uMinimumAlpha + uMaximumAlpha * (1.0 - vLineRadius * 1.0)) * sin(vLineRadius*2.0*vLineRadius*2.0 * 3.14);
        vec3 color = mix(uInsideColor, uOutsideColor, vLineRadius * 2.0);
        vec3 accentColor = vec3(0.66, 0.25, 0.88);
        color = mix(color, accentColor, vAccentColor * 0.8);
        // if (vLineRadius < 0.07) {
        //     color = vec3(1.0,1.0,1.0);
    //     alpha = 0.3;
    // }
    gl_FragColor = vec4(color.rgb, alpha);
    //gl_FragColor = vec4(1.0,1.0,1.0,1.0);
    
    
        //   #ifdef USE_LOGDEPTHBUF_EXT
        //       float depth = gl_FragDepthEXT / gl_FragCoord.w;
        //   #else
        //       float depth = gl_FragCoord.z / gl_FragCoord.w;
        //   #endif
        //   float fogFactor = smoothstep( fogNear, fogFar, depth );
        //   gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
   
    
}`;
