  
<?php
use Doctrine\ORM\Mapping as ORM;
/**
 * @ORM\Entity 
 * @ORM\Table(name="roles")
 */
class Role implements JsonSerializable
{
    /** @ORM\Id 
    * @ORM\Column(type="integer") 
     * @ORM\GeneratedValue */

    protected $id;


    /**
     * Many features have one product. This is the owning side.
     * @ORM\ManyToOne(targetEntity="Organization")
     */
    protected $organization;


    /** @ORM\Column(type="string") */
    protected $name;



    public function getId()
    {
        return $this->id;
    }

    public function getName()
    {
        return $this->name;
    }

    public function getOrganization()
    {
        return $this->organization;
    }
    
    public function setName($name)
    {
        $this->name = $name;
    }

    public function setOrganization($organization)
    {
        $this->organization = $organization;
    }

    public function jsonSerialize()
    {
        return array(
            'id' => $this->id,
            'name' => $this->name
        );
    }
}
