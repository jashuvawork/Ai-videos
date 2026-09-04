/**
 * Selects documentary camera language based on manufacturing action type.
 */
export class CameraEngineService {
  selectForAction(actionKey: string, fallbackMovement?: string, fallbackAngle?: string): {
    cameraAngle: string;
    cameraMovement: string;
  } {
    const key = actionKey.toLowerCase();

    if (key.includes("mix") || key.includes("dough")) {
      return {
        cameraAngle: "medium close-up mixer chamber",
        cameraMovement: "subtle push-in toward rotating paddles",
      };
    }
    if (key.includes("conveyor") || key.includes("cooling") || key.includes("finished") || key.includes("outbound")) {
      return {
        cameraAngle: "low-angle tracking along conveyor",
        cameraMovement: "slow lateral tracking shot following product on belt",
      };
    }
    if (key.includes("oven") || key.includes("baking") || key.includes("roast")) {
      return {
        cameraAngle: "tracking shot into industrial oven",
        cameraMovement: "tracking following product entering heat tunnel",
      };
    }
    if (key.includes("pack") || key.includes("wrapper")) {
      return {
        cameraAngle: "close-up packaging line",
        cameraMovement: "close-up tracking following packets through machinery",
      };
    }
    if (key.includes("cut") || key.includes("forming") || key.includes("stamp")) {
      return {
        cameraAngle: "overhead production shot",
        cameraMovement: "overhead tracking along forming line",
      };
    }
    if (key.includes("inspect") || key.includes("qc") || key.includes("quality")) {
      return {
        cameraAngle: "close-up inspection shot",
        cameraMovement: "static close-up on worker hands and product",
      };
    }
    if (key.includes("macro") || key.includes("pcb") || key.includes("smt") || key.includes("place")) {
      return {
        cameraAngle: "macro manufacturing close-up",
        cameraMovement: "static macro with minimal drift",
      };
    }
    if (key.includes("factory_intro") || key.includes("receiving")) {
      return {
        cameraAngle: "wide establishing factory shot",
        cameraMovement: "slow controlled push-in, not excessive drone spin",
      };
    }
    if (key.includes("cnc") || key.includes("machining") || key.includes("frame")) {
      return {
        cameraAngle: "medium side shot on machine fixture",
        cameraMovement: "static documentary shot with slight handheld micro-movement",
      };
    }

    return {
      cameraAngle: fallbackAngle || "medium factory documentary shot",
      cameraMovement: fallbackMovement || "slow controlled tracking",
    };
  }
}
