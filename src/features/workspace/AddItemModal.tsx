import { useState, type FormEvent } from "react";
import { Plus, Upload } from "lucide-react";
import { Button } from "../../components";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Checkbox } from "../../components/ui/checkbox";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { Textarea } from "../../components/ui/textarea";
import { uploadMenuImage, uploadSuperadminImage } from "../../api";
import {
  allergenOptions,
  dietaryTagOptions,
  halalStatusOptions,
  spiceLevelOptions,
  tagSuggestions,
  type Allergen,
  type DietaryTag,
  type HalalStatus,
  type MenuItem,
  type SpiceLevel,
} from "../../data";

function toggleSelection<T>(values: T[], value: T, checked: boolean) {
  return checked
    ? values.includes(value) ? values : [...values, value]
    : values.filter(current => current !== value);
}

export function AddItemModal({
  onClose,
  onAdd,
  onSave,
  initialItem,
  restaurantId,
  superadminRestaurantId,
}: {
  onClose: () => void;
  onAdd?: (item: MenuItem) => void;
  onSave?: (item: MenuItem) => void;
  initialItem?: MenuItem;
  restaurantId?: string;
  superadminRestaurantId?: string;
}) {
  const [name, setName] = useState(initialItem?.name ?? "");
  const [price, setPrice] = useState(initialItem?.price ?? "");
  const [description, setDescription] = useState(initialItem?.description ?? "");
  const [tag, setTag] = useState(initialItem?.tag ?? "");
  const [ingredients, setIngredients] = useState(initialItem?.ingredients ?? "");
  const [allergens, setAllergens] = useState<Allergen[]>(initialItem?.allergens ?? []);
  const [mayContain, setMayContain] = useState<Allergen[]>(initialItem?.mayContain ?? []);
  const [dietaryTags, setDietaryTags] = useState<DietaryTag[]>(initialItem?.dietaryTags ?? []);
  const [halalStatus, setHalalStatus] = useState<HalalStatus>(initialItem?.halalStatus ?? "UNKNOWN");
  const [spiceLevel, setSpiceLevel] = useState<SpiceLevel | "">(initialItem?.spiceLevel ?? "");
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState(initialItem?.image ?? "");
  const [category, setCategory] = useState(initialItem?.category ?? "Small plates");
  const [isSpecial, setIsSpecial] = useState(initialItem?.isSpecial ?? false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const chooseFile = (next?: File) => {
    if (!next) return;
    setFile(next);
    setPreview(URL.createObjectURL(next));
    setError("");
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || !price.trim()) {
      setError("Add a dish name and price first.");
      return;
    }
    setError("");
    setUploading(true);
    let imageKey: string | undefined = initialItem?.imageKey;
    if (file) {
      try {
        imageKey = superadminRestaurantId ? (await uploadSuperadminImage(superadminRestaurantId, file)).key || undefined : (await uploadMenuImage(file)).key || undefined;
      } catch {
        setUploading(false);
        setError("Couldn't upload the photo. Check your connection and try again.");
        return;
      }
    }
    const item = {
      id: initialItem?.id ?? String(Date.now()),
      name,
      description,
      price,
      category,
      tag: tag.trim() || undefined,
      image:
        preview ||
        "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=85",
       imageKey,
       status: initialItem?.status ?? "DRAFT",
       ingredients: ingredients.trim(),
       allergens,
       mayContain,
       dietaryTags,
       halalStatus,
       spiceLevel: spiceLevel || undefined,
      isSpecial,
     } satisfies MenuItem;
    if (onSave) await onSave(item);
    else if (onAdd) await onAdd(item);
    setUploading(false);
  };
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="modal">
        <DialogHeader className="modal-head">
          <div>
            <p className="section-kicker">{initialItem ? "Edit menu item" : "New menu item"}</p>
            <DialogTitle>{initialItem ? "Make it yours." : "Make it delicious."}</DialogTitle>
            <DialogDescription className="sr-only">
              Add or edit the details for this menu item.
            </DialogDescription>
          </div>
        </DialogHeader>
        <form onSubmit={submit}>
        <label className="upload-box">
          {preview ? <img src={preview} alt="Preview" /> : <Upload size={22} />}
          <strong>{preview ? "Photo ready" : "Drop a photo here"}</strong>
          <span>or browse from your device · JPG, PNG, WebP up to 10MB</span>
          <Input
            className="file-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => chooseFile(e.target.files?.[0])}
          />
        </label>
        <label>
          Dish name
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Charred octopus"
          />
        </label>
        <div className="form-split">
          <label>
            Price
            <Input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="18"
            />
          </label>
          <label>
            Category
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option>Small plates</option>
              <option>Mains</option>
              <option>From the sea</option>
              <option>Drinks</option>
            </Select>
          </label>
        </div>
        <label>
          Description
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A short, appetizing description"
          />
        </label>
        <label>
          Tag <span className="field-hint">Optional</span>
          <Input
            list="menu-tag-suggestions"
            value={tag}
            maxLength={32}
            onChange={(e) => setTag(e.target.value)}
            placeholder="e.g. Chef's pick"
          />
          <datalist id="menu-tag-suggestions">
            {tagSuggestions.map((suggestion) => <option key={suggestion} value={suggestion} />)}
          </datalist>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, fontSize: 13 }}>
          <input type="checkbox" checked={isSpecial} onChange={(e) => setIsSpecial(e.target.checked)} /> Mark as special — shows in hero collage & Tonights specials
        </label>
        <div className="item-details-form">
          <div className="detail-section-heading">
            <p className="section-kicker">Guest details</p>
            <p className="detail-helper">Structured information helps guests make informed choices.</p>
          </div>
          <label>
            Ingredient highlights <span className="field-hint">Optional</span>
            <Input
              value={ingredients}
              maxLength={500}
              onChange={(e) => setIngredients(e.target.value)}
              placeholder="e.g. Aubergine, miso, sesame, spring herbs"
            />
          </label>
          <div className="form-split">
            <label>
              Halal status
              <Select value={halalStatus} onChange={(e) => setHalalStatus(e.target.value as HalalStatus)}>
                {halalStatusOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </Select>
            </label>
            <label>
              Spice level
              <Select value={spiceLevel} onChange={(e) => setSpiceLevel(e.target.value as SpiceLevel | "")}>
                <option value="">Not specified</option>
                {spiceLevelOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </Select>
            </label>
          </div>
          <div className="detail-field-group">
            <p className="detail-field-label">Dietary labels <span className="field-hint">Optional</span></p>
            <div className="checkbox-grid">
              {dietaryTagOptions.map(option => {
                const id = `dietary-${option.value.toLowerCase()}`;
                return <div className="checkbox-option" key={option.value}><Checkbox id={id} checked={dietaryTags.includes(option.value)} onCheckedChange={checked => setDietaryTags(toggleSelection(dietaryTags, option.value, checked === true))} /><label htmlFor={id}>{option.label}</label></div>;
              })}
            </div>
          </div>
          <div className="detail-field-group">
            <p className="detail-field-label">Contains <span className="field-hint">UK 14 allergens</span></p>
            <div className="checkbox-grid">
              {allergenOptions.map(option => {
                const id = `contains-${option.value}`;
                return <div className="checkbox-option" key={option.value}><Checkbox id={id} checked={allergens.includes(option.value)} onCheckedChange={checked => setAllergens(toggleSelection(allergens, option.value, checked === true))} /><label htmlFor={id}>{option.label}</label></div>;
              })}
            </div>
          </div>
          <div className="detail-field-group">
            <p className="detail-field-label">May contain <span className="field-hint">Cross-contact</span></p>
            <div className="checkbox-grid">
              {allergenOptions.map(option => {
                const id = `may-contain-${option.value}`;
                return <div className="checkbox-option" key={option.value}><Checkbox id={id} checked={mayContain.includes(option.value)} onCheckedChange={checked => setMayContain(toggleSelection(mayContain, option.value, checked === true))} /><label htmlFor={id}>{option.label}</label></div>;
              })}
            </div>
          </div>
        </div>
        {error && <p className="auth-error">{error}</p>}
        <DialogFooter className="modal-actions">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="default"
            type="submit"
            disabled={uploading}
          >
            {uploading ? "Saving..." : initialItem ? "Save changes" : "Add to menu"} <Plus size={16} />
          </Button>
        </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
