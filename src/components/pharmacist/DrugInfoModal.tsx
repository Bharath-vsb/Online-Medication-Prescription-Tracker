import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { X, Loader2, AlertCircle, Pill, FileWarning, Beaker, ShieldAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface DrugInfo {
  name: string;
  genericName?: string;
  drugClass?: string;
  composition?: string;
  usage?: string[];
  dosage?: string;
  sideEffects?: string[];
  warnings?: string[];
  interactions?: string[];
  contraindications?: string[];
  storage?: string;
  manufacturer?: string;
}

interface DrugInfoModalProps {
  drugName: string | null;
  onClose: () => void;
}

const DrugInfoModal = ({ drugName, onClose }: DrugInfoModalProps) => {
  const [loading, setLoading] = useState(false);
  const [drugInfo, setDrugInfo] = useState<DrugInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (drugName) {
      fetchDrugInfo(drugName);
    } else {
      setDrugInfo(null);
      setError(null);
    }
  }, [drugName]);

  const fetchDrugInfo = async (name: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("drug-info", {
        body: { drugName: name },
      });

      if (fnError) throw fnError;

      if (data.error) {
        throw new Error(data.error);
      }

      setDrugInfo(data.drugInfo);
    } catch (err) {
      console.error("Error fetching drug info:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch drug information");
      toast.error("Failed to fetch drug information");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={!!drugName} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="w-5 h-5 text-primary" />
            Drug Information: {drugName}
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Fetching drug information...</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-12 h-12 text-destructive mb-4" />
            <p className="text-destructive font-medium">{error}</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => drugName && fetchDrugInfo(drugName)}
            >
              Retry
            </Button>
          </div>
        )}

        {drugInfo && !loading && (
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">{drugInfo.name}</h3>
                {drugInfo.genericName && (
                  <p className="text-muted-foreground">Generic: {drugInfo.genericName}</p>
                )}
                {drugInfo.drugClass && (
                  <Badge variant="secondary">{drugInfo.drugClass}</Badge>
                )}
              </div>

              {/* Composition */}
              {drugInfo.composition && (
                <div>
                  <h4 className="font-semibold flex items-center gap-2 mb-2">
                    <Beaker className="w-4 h-4 text-primary" />
                    Composition
                  </h4>
                  <p className="text-sm text-muted-foreground">{drugInfo.composition}</p>
                </div>
              )}

              {/* Usage */}
              {drugInfo.usage && drugInfo.usage.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Uses</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {drugInfo.usage.map((use, idx) => (
                      <li key={idx} className="text-sm text-muted-foreground">{use}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Dosage */}
              {drugInfo.dosage && (
                <div>
                  <h4 className="font-semibold mb-2">Dosage</h4>
                  <p className="text-sm text-muted-foreground">{drugInfo.dosage}</p>
                </div>
              )}

              {/* Side Effects */}
              {drugInfo.sideEffects && drugInfo.sideEffects.length > 0 && (
                <div>
                  <h4 className="font-semibold flex items-center gap-2 mb-2">
                    <FileWarning className="w-4 h-4 text-amber-500" />
                    Side Effects
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {drugInfo.sideEffects.map((effect, idx) => (
                      <Badge key={idx} variant="outline" className="text-amber-600">
                        {effect}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Warnings */}
              {drugInfo.warnings && drugInfo.warnings.length > 0 && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
                  <h4 className="font-semibold flex items-center gap-2 mb-2 text-destructive">
                    <ShieldAlert className="w-4 h-4" />
                    Warnings
                  </h4>
                  <ul className="list-disc list-inside space-y-1">
                    {drugInfo.warnings.map((warning, idx) => (
                      <li key={idx} className="text-sm text-destructive">{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Interactions */}
              {drugInfo.interactions && drugInfo.interactions.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Drug Interactions</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {drugInfo.interactions.map((interaction, idx) => (
                      <li key={idx} className="text-sm text-muted-foreground">{interaction}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Contraindications */}
              {drugInfo.contraindications && drugInfo.contraindications.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Contraindications</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {drugInfo.contraindications.map((item, idx) => (
                      <li key={idx} className="text-sm text-muted-foreground">{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Storage */}
              {drugInfo.storage && (
                <div>
                  <h4 className="font-semibold mb-2">Storage</h4>
                  <p className="text-sm text-muted-foreground">{drugInfo.storage}</p>
                </div>
              )}

              {/* Disclaimer */}
              <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
                <p className="font-medium mb-1">⚠️ Disclaimer</p>
                <p>
                  This information is for reference only. Always consult a healthcare 
                  professional before taking any medication. Do not use this information 
                  for self-diagnosis or treatment.
                </p>
              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DrugInfoModal;