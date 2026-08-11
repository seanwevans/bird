export class ShaderUtils {
  static applyThermalShader(material, heatUniforms) {
    material.onBeforeCompile = (shader) => {
      shader.uniforms.windSpeed = heatUniforms.windSpeed;
      shader.vertexShader =
        `varying vec3 vWorldNormalHeat;\n` + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <project_vertex>",
        `#include <project_vertex>\nvWorldNormalHeat = normalize((modelMatrix * vec4(normal, 0.0)).xyz);`
      );

      shader.fragmentShader =
        `
        uniform float windSpeed;
        varying vec3 vWorldNormalHeat;
        vec3 getThermalColor(float t) {
          t = clamp(t, 0.0, 1.0);
          vec3 blue = vec3(0.0, 0.0, 1.0);
          vec3 cyan = vec3(0.0, 1.0, 1.0);
          vec3 green = vec3(0.0, 1.0, 0.0);
          vec3 yellow = vec3(1.0, 1.0, 0.0);
          vec3 red = vec3(1.0, 0.0, 0.0);
          if (t < 0.25) return mix(blue, cyan, t * 4.0);
          if (t < 0.5) return mix(cyan, green, (t - 0.25) * 4.0);
          if (t < 0.75) return mix(green, yellow, (t - 0.5) * 4.0);
          return mix(yellow, red, (t - 0.75) * 4.0);
        }
      ` + shader.fragmentShader;

      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <color_fragment>",
        `#include <color_fragment>
         float dotProdHeat = dot(vWorldNormalHeat, vec3(0.0, 0.0, 1.0));
         float mappedTempHeat = (dotProdHeat + 1.0) * 0.5;
         mappedTempHeat = pow(mappedTempHeat, 1.5);
         float finalHeatVal = (mappedTempHeat * 0.8 + 0.1) * (0.3 + windSpeed * 0.8);
         diffuseColor.rgb = getThermalColor(finalHeatVal);`
      );
    };
  }
}

