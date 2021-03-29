  
<?php
use Doctrine\ORM\Mapping as ORM;
/**
 * @ORM\Entity 
 * @ORM\Table(name="org_acl")
 */
class OrgACL implements JsonSerializable
{
    /** @ORM\Id 
     * @ORM\Column(type="integer") 
     * @ORM\GeneratedValue */
    protected $id;

    /**
     * Many features have one product. This is the owning side.
     * @ORM\ManyToOne(targetEntity="Role")
     */    
    protected $role;

    /** @ORM\Column(type="string") */
    protected $permission;

    /**
     * @ORM\ManyToOne(targetEntity="Organization")
     * 
     */
    protected $organization;

    public function getId()
    {
        return $this->id;
    }

    public function getPermission()
    {
        return $this->permission;
    }

    public function getRole()
    {
        return $this->role;
    }
    
    public function getOrganization()
    {
        return $this->role;
    }

    public function setPermission($permission)
    {
        $this->permission = $permission;
    }


    public function setRole($role)
    {
        $this->role = $role;
    }

    public function setOrganization($organization)
    {
        $this->organization = $organization;
    }


    public function jsonSerialize()
    {
        return array(
            'permission' => $this->permission,
        );
    }

}

