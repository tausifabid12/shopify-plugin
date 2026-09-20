"use client"

import { INDIAN_REGIONS, resolveRegion } from "@/lib/checkout/regions"
import { isFieldRequired, isFieldVisible } from "@/lib/checkout/theme"
import type { CheckoutAddress, CheckoutConfigPayload } from "@/lib/checkout/types"

import { fieldLabel, fieldPlaceholder } from "./contact-section"
import { CkField, CkInput, CkSelect } from "./primitives"

/**
 * Delivery address (§6).
 *
 * Field visibility, labels and required-ness all come from the merchant's
 * config. `autoComplete` tokens are set precisely because address autofill is
 * the single biggest conversion lever on a mobile checkout — getting them wrong
 * costs more than any amount of visual polish wins.
 */

export type AddressErrors = Partial<Record<keyof CheckoutAddress, string>>

export function AddressSection({
  config,
  value,
  errors,
  onChange,
  onBlur,
  disabled,
}: {
  config: CheckoutConfigPayload
  value: CheckoutAddress
  errors?: AddressErrors
  onChange: (patch: Partial<CheckoutAddress>) => void
  onBlur?: () => void
  disabled?: boolean
}) {
  const fields = config.fields
  const show = (key: Parameters<typeof isFieldVisible>[1]) => isFieldVisible(fields, key)
  const required = (key: Parameters<typeof isFieldRequired>[1]) =>
    isFieldRequired(fields, key)

  const selectedRegion = resolveRegion(value.provinceCode || value.province)

  return (
    <div className="grid gap-4 @min-[640px]:grid-cols-2">
      {show("firstName") && (
        <CkField
          label={fieldLabel(config, "firstName", "First name")}
          required={required("firstName")}
          error={errors?.firstName}
          htmlFor="ck-first-name"
        >
          <CkInput
            id="ck-first-name"
            autoComplete="given-name"
            placeholder={fieldPlaceholder(config, "firstName", "")}
            value={value.firstName ?? ""}
            invalid={Boolean(errors?.firstName)}
            disabled={disabled}
            onChange={(e) => onChange({ firstName: e.target.value })}
            onBlur={onBlur}
          />
        </CkField>
      )}

      {show("lastName") && (
        <CkField
          label={fieldLabel(config, "lastName", "Last name")}
          required={required("lastName")}
          error={errors?.lastName}
          htmlFor="ck-last-name"
        >
          <CkInput
            id="ck-last-name"
            autoComplete="family-name"
            placeholder={fieldPlaceholder(config, "lastName", "")}
            value={value.lastName ?? ""}
            invalid={Boolean(errors?.lastName)}
            disabled={disabled}
            onChange={(e) => onChange({ lastName: e.target.value })}
            onBlur={onBlur}
          />
        </CkField>
      )}

      {show("address1") && (
        <CkField
          label={fieldLabel(config, "address1", "Address")}
          required={required("address1")}
          error={errors?.address1}
          htmlFor="ck-address1"
          className="@min-[640px]:col-span-2"
        >
          <CkInput
            id="ck-address1"
            autoComplete="address-line1"
            placeholder={fieldPlaceholder(config, "address1", "House / flat, street")}
            value={value.address1 ?? ""}
            invalid={Boolean(errors?.address1)}
            disabled={disabled}
            onChange={(e) => onChange({ address1: e.target.value })}
            onBlur={onBlur}
          />
        </CkField>
      )}

      {show("address2") && (
        <CkField
          label={fieldLabel(config, "address2", "Apartment, landmark (optional)")}
          required={required("address2")}
          error={errors?.address2}
          htmlFor="ck-address2"
          className="@min-[640px]:col-span-2"
        >
          <CkInput
            id="ck-address2"
            autoComplete="address-line2"
            placeholder={fieldPlaceholder(config, "address2", "")}
            value={value.address2 ?? ""}
            invalid={Boolean(errors?.address2)}
            disabled={disabled}
            onChange={(e) => onChange({ address2: e.target.value })}
            onBlur={onBlur}
          />
        </CkField>
      )}

      {show("zip") && (
        <CkField
          label={fieldLabel(config, "zip", "PIN code")}
          required={required("zip")}
          error={errors?.zip}
          htmlFor="ck-zip"
        >
          <CkInput
            id="ck-zip"
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={6}
            placeholder={fieldPlaceholder(config, "zip", "560001")}
            value={value.zip ?? ""}
            invalid={Boolean(errors?.zip)}
            disabled={disabled}
            onChange={(e) =>
              onChange({ zip: e.target.value.replace(/\D/g, "").slice(0, 6) })
            }
            onBlur={onBlur}
          />
        </CkField>
      )}

      {show("city") && (
        <CkField
          label={fieldLabel(config, "city", "City")}
          required={required("city")}
          error={errors?.city}
          htmlFor="ck-city"
        >
          <CkInput
            id="ck-city"
            autoComplete="address-level2"
            placeholder={fieldPlaceholder(config, "city", "")}
            value={value.city ?? ""}
            invalid={Boolean(errors?.city)}
            disabled={disabled}
            onChange={(e) => onChange({ city: e.target.value })}
            onBlur={onBlur}
          />
        </CkField>
      )}

      {show("province") && (
        <CkField
          label={fieldLabel(config, "province", "State")}
          required={required("province")}
          error={errors?.province}
          htmlFor="ck-province"
          className={show("country") ? undefined : "@min-[640px]:col-span-2"}
        >
          <CkSelect
            id="ck-province"
            autoComplete="address-level1"
            value={selectedRegion?.code ?? ""}
            invalid={Boolean(errors?.province)}
            disabled={disabled}
            onChange={(e) => {
              const region = resolveRegion(e.target.value)
              // Both are sent: Shopify matches reliably on the code, and the
              // name is what a merchant reads in their admin.
              onChange({ provinceCode: region?.code, province: region?.name })
              onBlur?.()
            }}
          >
            <option value="">Select state</option>
            {INDIAN_REGIONS.map((region) => (
              <option key={region.code} value={region.code}>
                {region.name}
              </option>
            ))}
          </CkSelect>
        </CkField>
      )}

      {show("country") && (
        <CkField
          label={fieldLabel(config, "country", "Country")}
          required={required("country")}
          htmlFor="ck-country"
        >
          <CkSelect
            id="ck-country"
            autoComplete="country"
            value={value.countryCode ?? "IN"}
            disabled={disabled}
            onChange={(e) =>
              onChange({
                countryCode: e.target.value,
                country: e.target.value === "IN" ? "India" : e.target.value,
              })
            }
          >
            <option value="IN">India</option>
          </CkSelect>
        </CkField>
      )}
    </div>
  )
}
