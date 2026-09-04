import { useState, type FormEvent } from "react";
import { ArrowLeft, Plus, Upload } from "lucide-react";
import { Button } from "../../components";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { Textarea } from "../../components/ui/textarea";
import { uploadMenuImage, uploadSuperadminImage } from "../../api";
import { currencySymbol } from "../../lib/currency";
import {
  categories,
  tagSuggestions,
  type MenuItem,
} from "../../data";
const menuCategoryOptions = categories.slice(1);

export function MenuItemEditor({
  onCancel,
  onSubmit,
  initialItem,
  superadminRestaurantId,
  currency = "IDR",
}: {
  onCancel: () => void;
  onSubmit: (item: MenuItem) => Promise<boolean>;
  initialItem?: MenuItem;
  superadminRestaurantId?: string;
  currency?: string;
}) {
  const [name, setName] = useState(initialItem?.name ?? "");
  const [price, setPrice] = useState(String(initialItem?.price ?? ""));
  const [description, setDescription] = useState(initialItem?.description ?? "");
  const [tag, setTag] = useState(initialItem?.tag ?? "");
  const [preview, setPreview] = useState(initialItem?.image ?? "");
  const [file, setFile] = useState<File>();
  const [category, setCategory] = useState(initialItem?.category ?? menuCategoryOptions[0]);
  const [isSpecial, setIsSpecial] = useState(initialItem?.isSpecial ?? false);
  const [error, setError] = useState("");
  const [tagSuggestionsOpen, setTagSuggestionsOpen] = useState(false);
  const matchingTagSuggestions = tagSuggestions.filter((suggestion) =>
    suggestion.toLocaleLowerCase().includes(tag.trim().toLocaleLowerCase()),
  );
  const chooseTagSuggestion = (suggestion: string) => {
    setTag(suggestion);
    setTagSuggestionsOpen(false);
  };
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
      isSpecial,
     } satisfies MenuItem;
    const saved = await onSubmit(item);
    setUploading(false);
    if (saved) onCancel();
  };
  return (
    <div className="menu-item-page">
      <div className="menu-item-page-header">
        <button type="button" className="menu-item-back" onClick={onCancel}>
          <ArrowLeft size={16} /> Back to menu
        </button>
        <p className="section-kicker">{initialItem ? "Edit menu item" : "New menu item"}</p>
        <h1>{initialItem ? "Make it yours." : "Make it delicious."}</h1>
        <p>Add or edit the details for this menu item.</p>
      </div>
      <form className="menu-item-form" onSubmit={submit}>
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
            <div className="currency-input">
              <span className="currency-input-prefix" aria-hidden="true">{currencySymbol(currency)}</span>
              <Input
                className="currency-input-field"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="18"
                aria-label={`Price in ${currency}`}
              />
            </div>
          </label>
          <label>
            Category
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {!menuCategoryOptions.includes(category) && <option value={category}>{category}</option>}
              {menuCategoryOptions.map((option) => <option key={option} value={option}>{option}</option>)}
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
          <div className="tag-input-wrap">
            <Input
              role="combobox"
              aria-autocomplete="list"
              aria-controls="menu-tag-suggestions"
              aria-expanded={tagSuggestionsOpen && matchingTagSuggestions.length > 0}
              value={tag}
              maxLength={32}
              onFocus={() => setTagSuggestionsOpen(true)}
              onBlur={() => window.setTimeout(() => setTagSuggestionsOpen(false), 100)}
              onChange={(e) => {
                setTag(e.target.value);
                setTagSuggestionsOpen(true);
              }}
              placeholder="e.g. Chef's pick"
            />
            {tagSuggestionsOpen && matchingTagSuggestions.length > 0 && (
              <div id="menu-tag-suggestions" className="tag-suggestions" role="listbox">
                {matchingTagSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="tag-suggestion"
                    role="option"
                    aria-selected={suggestion === tag}
                    onPointerDown={(event) => event.preventDefault()}
                    onClick={() => chooseTagSuggestion(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, fontSize: 13 }}>
          <input type="checkbox" checked={isSpecial} onChange={(e) => setIsSpecial(e.target.checked)} /> Show in hero collage and Tonight's specials
        </label>
        {error && <p className="auth-error">{error}</p>}
        <div className="menu-item-form-actions">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="default"
            type="submit"
            disabled={uploading}
          >
            {uploading ? "Saving..." : initialItem ? "Save changes" : "Add to menu"} <Plus size={16} />
          </Button>
        </div>
      </form>
    </div>
  );
}
