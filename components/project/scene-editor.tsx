"use client";

import { useState } from "react";
import { RefreshCw, Mic, Image as ImageIcon, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

interface Scene {
  id: string;
  sceneNumber: number;
  duration: number;
  narration?: string | null;
  visualDescription?: string | null;
  caption?: string | null;
  cameraMovement?: string | null;
  cameraAngle?: string | null;
  status: string;
}

interface SceneEditorProps {
  scenes: Scene[];
  projectId: string;
  onRegenerate: (sceneId: string) => void;
}

export function SceneEditor({ scenes, projectId, onRegenerate }: SceneEditorProps) {
  const [selectedScene, setSelectedScene] = useState<Scene | null>(scenes[0] || null);
  const [regenerating, setRegenerating] = useState<string | null>(null);

  const handleRegenerate = async (sceneId: string) => {
    setRegenerating(sceneId);
    try {
      await fetch(`/api/projects/${projectId}/scenes/${sceneId}/regenerate`, { method: "POST" });
      onRegenerate(sceneId);
    } finally {
      setRegenerating(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {scenes.map((scene) => (
          <button
            key={scene.id}
            onClick={() => setSelectedScene(scene)}
            className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-all border ${
              selectedScene?.id === scene.id
                ? "bg-violet-600/20 border-violet-600/50 text-violet-300"
                : "bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700"
            }`}
          >
            Scene {scene.sceneNumber}
            <span className="ml-1 text-xs text-zinc-500">{scene.duration}s</span>
          </button>
        ))}
      </div>

      {selectedScene && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Scene {selectedScene.sceneNumber}</CardTitle>
            <Badge variant={selectedScene.status === "visual_complete" ? "success" : "outline"}>
              {selectedScene.status}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wider">Visual</label>
              <p className="text-sm text-zinc-300 mt-1">{selectedScene.visualDescription}</p>
            </div>
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wider">Narration</label>
              <p className="text-sm text-zinc-300 mt-1">{selectedScene.narration}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-zinc-500">Camera:</span>
                <span className="text-zinc-300 ml-2">{selectedScene.cameraAngle}</span>
              </div>
              <div>
                <span className="text-zinc-500">Movement:</span>
                <span className="text-zinc-300 ml-2">{selectedScene.cameraMovement}</span>
              </div>
              <div>
                <span className="text-zinc-500">Duration:</span>
                <span className="text-zinc-300 ml-2">{selectedScene.duration}s</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleRegenerate(selectedScene.id)}
                disabled={regenerating === selectedScene.id}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${regenerating === selectedScene.id ? "animate-spin" : ""}`} />
                Regenerate Scene
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleRegenerate(selectedScene.id)}>
                <ImageIcon className="h-3.5 w-3.5" />
                Regenerate Visual
              </Button>
              <Button variant="outline" size="sm">
                <Mic className="h-3.5 w-3.5" />
                Regenerate Voice
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
